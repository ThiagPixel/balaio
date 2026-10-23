-- Início explícito de cada etapa, sem alterar permissões ou conclusões antigas.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.complete_service_order_step(uuid,text)') is null then
    raise exception 'A migration 0027 precisa estar aplicada.';
  end if;
end $$;

alter table public.service_order_steps
  add column started_at timestamptz,
  add column started_by uuid,
  add constraint service_order_steps_started_by_fk
    foreign key (tenant_id, started_by) references public.users(tenant_id, id),
  add constraint service_order_steps_start_pair_chk
    check ((started_at is null) = (started_by is null));

create function public.start_service_order_step(p_step_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_step public.service_order_steps%rowtype; v_status text;
begin
  v_tenant := private.require_permission('os.execute');
  select * into v_step from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant;
  if not found then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  if v_step.assignee_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Etapa atribuída a outro profissional.';
  end if;
  select status into v_status from public.service_orders
    where id = v_step.order_id and tenant_id = v_tenant for update;
  select * into v_step from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant for update;
  if v_status not in ('IN_PROGRESS', 'WAITING') or v_step.started_at is not null
    or v_step.completed_at is not null then
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

-- A leitura da OS continua em uma única RPC para não acrescentar busca na tela.
create or replace function public.get_service_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select to_jsonb(o) || jsonb_build_object(
    'principal_name',coalesce(u.full_name,u.email),
    'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from (
      select st.id,st.position,st.title,st.assignee_id,coalesce(assignee.full_name,assignee.email) as assignee_name,
        st.started_at,st.completed_at,st.completion_note,
        (select prerequisite.title from public.service_order_step_dependencies d
          join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
            and prerequisite.tenant_id = d.tenant_id
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id
          limit 1) as depends_on_title,
        (select prerequisite.completed_at is not null from public.service_order_step_dependencies d
          join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
            and prerequisite.tenant_id = d.tenant_id
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id
          limit 1) as depends_on_completed
      from public.service_order_steps st
      join public.users assignee on assignee.id = st.assignee_id and assignee.tenant_id = st.tenant_id
      where st.tenant_id = v_tenant and st.order_id = o.id
    ) s),'[]'::jsonb),
    'blockers',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at) from (
      select id,kind,description,responsible_name,created_at,resolved_at,resolution_note
      from public.service_order_blockers where tenant_id = v_tenant and order_id = o.id
    ) b),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from (
      select id,event_type,detail,created_at from public.service_order_events
      where tenant_id = v_tenant and order_id = o.id order by created_at desc,id desc limit 50
    ) e),'[]'::jsonb)
  ) from public.service_orders o join public.users u on u.id = o.principal_id and u.tenant_id = o.tenant_id
  where o.id = p_order_id and o.tenant_id = v_tenant);
end; $$;

revoke all on function public.start_service_order_step(uuid) from public, anon, authenticated;
grant execute on function public.start_service_order_step(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
