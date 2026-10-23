-- Edição da OS e manutenção de etapas. A exclusão recuperável vem na 0034.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.update_service_order_step(uuid,text,uuid,boolean)') is null then
    raise exception 'A migration 0032 precisa estar aplicada.';
  end if;
end $$;

create function public.update_service_order(p_order_id uuid, p_title text,
  p_description text, p_location_label text, p_priority text,
  p_due_date date, p_principal_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_old public.service_orders%rowtype;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  if length(btrim(coalesce(p_title,''))) not between 3 and 160
    or length(coalesce(p_description,'')) > 2000
    or length(coalesce(p_location_label,'')) > 160
    or p_priority is null or p_priority not in ('LOW','NORMAL','HIGH')
    or p_due_date is null or not isfinite(p_due_date) then
    raise exception using errcode = '22023', message = 'Dados da OS inválidos.';
  end if;
  select * into v_old from public.service_orders
    where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception using errcode = 'P0002', message = 'OS não encontrada.'; end if;
  if v_old.status = 'COMPLETED' then
    raise exception using errcode = '22023', message = 'OS concluída não pode ser editada.';
  end if;
  if p_due_date <> v_old.due_date
    and p_due_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '22023', message = 'Selecione um prazo a partir de hoje.';
  end if;
  if not exists(select 1 from public.users u
    where u.id = p_principal_id and u.tenant_id = v_tenant and u.active) then
    raise exception using errcode = '22023', message = 'Responsável principal inválido.';
  end if;
  update public.service_orders set title = btrim(p_title),
    description = nullif(btrim(coalesce(p_description,'')),''),
    location_label = nullif(btrim(coalesce(p_location_label,'')),''),
    priority = p_priority, due_date = p_due_date, principal_id = p_principal_id,
    updated_at = now()
  where id = p_order_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,p_order_id,auth.uid(),'ORDER_UPDATED',jsonb_build_object(
    'old_title',v_old.title,'new_title',btrim(p_title),
    'old_principal_id',v_old.principal_id,'new_principal_id',p_principal_id));
end; $$;

create function public.add_service_order_step(p_order_id uuid, p_title text,
  p_assignee_id uuid, p_depends_on_previous boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_status text; v_position integer; v_previous uuid; v_id uuid;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  if length(btrim(coalesce(p_title,''))) not between 3 and 160
    or p_assignee_id is null or p_depends_on_previous is null then
    raise exception using errcode = '22023', message = 'Dados da etapa inválidos.';
  end if;
  select status into v_status from public.service_orders
    where id = p_order_id and tenant_id = v_tenant for update;
  if v_status is null then raise exception using errcode = 'P0002', message = 'OS não encontrada.'; end if;
  if v_status = 'COMPLETED' then
    raise exception using errcode = '22023', message = 'OS concluída não pode receber etapas.';
  end if;
  if not exists(select 1 from public.users u
    where u.id = p_assignee_id and u.tenant_id = v_tenant and u.active) then
    raise exception using errcode = '22023', message = 'Profissional inválido.';
  end if;
  select coalesce(max(position),0) + 1 into v_position from public.service_order_steps
    where tenant_id = v_tenant and order_id = p_order_id;
  if v_position > 20 then
    raise exception using errcode = '22023', message = 'A OS aceita até 20 etapas.';
  end if;
  if p_depends_on_previous then
    select id into v_previous from public.service_order_steps
      where tenant_id = v_tenant and order_id = p_order_id and position = v_position - 1;
  end if;
  insert into public.service_order_steps(tenant_id,order_id,position,title,assignee_id)
  values(v_tenant,p_order_id,v_position,btrim(p_title),p_assignee_id) returning id into v_id;
  if v_previous is not null then
    insert into public.service_order_step_dependencies(tenant_id,order_id,step_id,prerequisite_step_id)
    values(v_tenant,p_order_id,v_id,v_previous);
  end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,p_order_id,auth.uid(),'STEP_ADDED',jsonb_build_object('step_id',v_id,'title',btrim(p_title)));
  return v_id;
end; $$;

create function public.delete_service_order_step(p_step_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_step public.service_order_steps%rowtype; v_status text; v_count integer;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  select order_id into v_step.order_id from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant;
  if v_step.order_id is null then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  select status into v_status from public.service_orders
    where id = v_step.order_id and tenant_id = v_tenant for update;
  select * into v_step from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant for update;
  if v_status = 'COMPLETED' or v_step.started_at is not null or v_step.completed_at is not null then
    raise exception using errcode = '22023', message = 'Somente etapas não iniciadas podem ser excluídas.';
  end if;
  select count(*) into v_count from public.service_order_steps
    where tenant_id = v_tenant and order_id = v_step.order_id;
  if v_count <= 1 then
    raise exception using errcode = '22023', message = 'A OS precisa ter pelo menos uma etapa.';
  end if;
  delete from public.service_order_step_dependencies
    where tenant_id = v_tenant and order_id = v_step.order_id
      and (step_id = p_step_id or prerequisite_step_id = p_step_id);
  delete from public.service_order_steps where id = p_step_id and tenant_id = v_tenant;
  -- Duas fases evitam colisão com a chave única (order_id, position).
  update public.service_order_steps set position = position + 100
    where tenant_id = v_tenant and order_id = v_step.order_id and position > v_step.position;
  update public.service_order_steps set position = position - 101
    where tenant_id = v_tenant and order_id = v_step.order_id and position > 100;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_step.order_id,auth.uid(),'STEP_DELETED',jsonb_build_object(
    'step_id',p_step_id,'title',v_step.title,'position',v_step.position));
end; $$;

revoke all on function public.update_service_order(uuid,text,text,text,text,date,uuid),
  public.add_service_order_step(uuid,text,uuid,boolean),
  public.delete_service_order_step(uuid) from public, anon, authenticated;
grant execute on function public.update_service_order(uuid,text,text,text,text,date,uuid),
  public.add_service_order_step(uuid,text,uuid,boolean),
  public.delete_service_order_step(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
