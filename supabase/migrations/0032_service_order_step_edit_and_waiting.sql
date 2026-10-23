-- Edição controlada de etapas e pausa da execução enquanto há pendências.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.start_service_order_step(uuid)') is null then
    raise exception 'A migration 0031 precisa estar aplicada.';
  end if;
end $$;

create function public.list_service_order_edit_people()
returns table(id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  return query select u.id,u.full_name,u.email from public.users u
    where u.tenant_id = v_tenant and u.active order by coalesce(u.full_name,u.email);
end; $$;

create function public.update_service_order_step(p_step_id uuid, p_title text,
  p_assignee_id uuid, p_depends_on_previous boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_step public.service_order_steps%rowtype; v_status text;
  v_previous_id uuid; v_old_dependency boolean;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  if length(btrim(coalesce(p_title, ''))) not between 3 and 160
    or p_assignee_id is null or p_depends_on_previous is null then
    raise exception using errcode = '22023', message = 'Dados da etapa inválidos.';
  end if;
  select order_id into v_step.order_id from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant;
  if v_step.order_id is null then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  select status into v_status from public.service_orders
    where id = v_step.order_id and tenant_id = v_tenant for update;
  select * into v_step from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant for update;
  if v_status = 'COMPLETED' or v_step.started_at is not null or v_step.completed_at is not null then
    raise exception using errcode = '22023', message = 'Somente etapas ainda não iniciadas podem ser editadas.';
  end if;
  if not exists(select 1 from public.users u
    where u.id = p_assignee_id and u.tenant_id = v_tenant and u.active) then
    raise exception using errcode = '22023', message = 'Profissional inválido.';
  end if;
  select id into v_previous_id from public.service_order_steps
    where tenant_id = v_tenant and order_id = v_step.order_id and position = v_step.position - 1;
  if p_depends_on_previous and v_previous_id is null then
    raise exception using errcode = '22023', message = 'A primeira etapa não pode ter dependência.';
  end if;
  select exists(select 1 from public.service_order_step_dependencies d
    where d.tenant_id = v_tenant and d.order_id = v_step.order_id and d.step_id = p_step_id)
    into v_old_dependency;
  update public.service_order_steps set title = btrim(p_title), assignee_id = p_assignee_id
    where id = p_step_id and tenant_id = v_tenant;
  delete from public.service_order_step_dependencies
    where tenant_id = v_tenant and order_id = v_step.order_id and step_id = p_step_id;
  if p_depends_on_previous then
    insert into public.service_order_step_dependencies(tenant_id,order_id,step_id,prerequisite_step_id)
    values(v_tenant,v_step.order_id,p_step_id,v_previous_id);
  end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_step.order_id,auth.uid(),'STEP_UPDATED',jsonb_build_object(
    'step_id',p_step_id,'old_title',v_step.title,'new_title',btrim(p_title),
    'old_assignee_id',v_step.assignee_id,'new_assignee_id',p_assignee_id,
    'old_depends_on_previous',v_old_dependency,'new_depends_on_previous',p_depends_on_previous));
end; $$;

-- O status WAITING bloqueia execução; resolver todas as pendências restaura IN_PROGRESS.
create or replace function public.start_service_order_step(p_step_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_step public.service_order_steps%rowtype; v_status text;
begin
  v_tenant := private.require_permission('os.execute');
  select * into v_step from public.service_order_steps where id = p_step_id and tenant_id = v_tenant;
  if not found then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  if v_step.assignee_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Etapa atribuída a outro profissional.';
  end if;
  select status into v_status from public.service_orders
    where id = v_step.order_id and tenant_id = v_tenant for update;
  select * into v_step from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant for update;
  if v_status = 'WAITING' then
    raise exception using errcode = '22023', message = 'Resolva as pendências antes de iniciar a etapa.';
  end if;
  if v_status <> 'IN_PROGRESS' or v_step.started_at is not null or v_step.completed_at is not null then
    raise exception using errcode = '22023', message = 'Etapa indisponível para início.';
  end if;
  if exists(select 1 from public.service_order_step_dependencies d
    join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
      and prerequisite.tenant_id = d.tenant_id
    where d.tenant_id = v_tenant and d.order_id = v_step.order_id and d.step_id = p_step_id
      and prerequisite.completed_at is null) then
    raise exception using errcode = '22023', message = 'Conclua a etapa anterior primeiro.';
  end if;
  update public.service_order_steps set started_at = now(), started_by = auth.uid()
    where id = p_step_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_step.order_id,auth.uid(),'STEP_STARTED',jsonb_build_object('step_id',p_step_id));
end; $$;

create or replace function public.complete_service_order_step(p_step_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_order uuid; v_assignee uuid; v_done timestamptz; v_status text;
begin
  v_tenant := private.require_permission('os.execute');
  if length(coalesce(p_note,'')) > 1000 then raise exception using errcode = '22023', message = 'Observação muito longa.'; end if;
  select order_id,assignee_id,completed_at into v_order,v_assignee,v_done from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant;
  if v_order is null then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  select status into v_status from public.service_orders where id = v_order and tenant_id = v_tenant for update;
  if v_assignee <> auth.uid() then raise exception using errcode = '42501', message = 'Etapa atribuída a outro profissional.'; end if;
  if v_status = 'WAITING' then
    raise exception using errcode = '22023', message = 'Resolva as pendências antes de concluir a etapa.';
  end if;
  if v_status <> 'IN_PROGRESS' or v_done is not null then
    raise exception using errcode = '22023', message = 'Etapa indisponível para conclusão.';
  end if;
  if exists(select 1 from public.service_order_step_dependencies d
    join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id and prerequisite.tenant_id = d.tenant_id
    where d.tenant_id = v_tenant and d.order_id = v_order and d.step_id = p_step_id
      and prerequisite.completed_at is null) then
    raise exception using errcode = '22023', message = 'Conclua a etapa anterior primeiro.';
  end if;
  update public.service_order_steps set completed_at = now(),completed_by = auth.uid(),
    completion_note = nullif(btrim(p_note),'') where id = p_step_id and tenant_id = v_tenant and completed_at is null;
  if not found then raise exception using errcode = '22023', message = 'Etapa já concluída.'; end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_order,auth.uid(),'STEP_COMPLETED',jsonb_build_object('step_id',p_step_id,'note',p_note));
end; $$;

revoke all on function public.list_service_order_edit_people(),
  public.update_service_order_step(uuid,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.list_service_order_edit_people(),
  public.update_service_order_step(uuid,text,uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
