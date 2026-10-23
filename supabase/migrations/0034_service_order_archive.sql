-- Exclusão recuperável de OS: retira da operação sem perder etapas, foto ou histórico.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.delete_service_order_step(uuid)') is null then
    raise exception 'A migration 0033 precisa estar aplicada.';
  end if;
end $$;

alter table public.service_orders add column archived_at timestamptz,
  add column archived_by uuid,
  add constraint service_orders_archived_by_fk foreign key (tenant_id, archived_by) references public.users(tenant_id, id),
  add constraint service_orders_archive_pair_chk check ((archived_at is null) = (archived_by is null));
create index service_orders_archived_idx on public.service_orders(tenant_id, archived_at desc)
  where archived_at is not null;

create function public.archive_service_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  perform 1 from public.service_orders where id = p_order_id and tenant_id = v_tenant and archived_at is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'OS ativa não encontrada.'; end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,p_order_id,auth.uid(),'ORDER_ARCHIVED','{}'::jsonb);
  update public.service_orders set archived_at = now(), archived_by = auth.uid(), updated_at = now()
    where id = p_order_id and tenant_id = v_tenant;
end; $$;

create function public.restore_service_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  perform 1 from public.service_orders where id = p_order_id and tenant_id = v_tenant and archived_at is not null for update;
  if not found then raise exception using errcode = 'P0002', message = 'OS excluída não encontrada.'; end if;
  update public.service_orders set archived_at = null, archived_by = null, updated_at = now()
    where id = p_order_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,p_order_id,auth.uid(),'ORDER_RESTORED','{}'::jsonb);
end; $$;

-- Guarda centralizada: RPCs antigas também ficam impedidas de alterar OS excluídas.
create function private.guard_archived_service_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_order uuid; v_tenant uuid;
begin
  if TG_TABLE_NAME = 'service_orders' then
    if TG_OP = 'UPDATE' and OLD.archived_at is not null and NEW.archived_at is not null then
      raise exception using errcode = '22023', message = 'Restaure a OS antes de alterá-la.';
    end if;
    return NEW;
  end if;
  if TG_OP = 'DELETE' then v_order := OLD.order_id; v_tenant := OLD.tenant_id;
  else v_order := NEW.order_id; v_tenant := NEW.tenant_id; end if;
  if exists(select 1 from public.service_orders where id = v_order and tenant_id = v_tenant and archived_at is not null) then
    raise exception using errcode = '22023', message = 'Restaure a OS antes de alterá-la.';
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end; $$;

create trigger service_orders_archive_guard before update on public.service_orders
  for each row execute function private.guard_archived_service_order();
create trigger service_order_steps_archive_guard before insert or update or delete on public.service_order_steps
  for each row execute function private.guard_archived_service_order();
create trigger service_order_dependencies_archive_guard before insert or update or delete on public.service_order_step_dependencies
  for each row execute function private.guard_archived_service_order();
create trigger service_order_blockers_archive_guard before insert or update or delete on public.service_order_blockers
  for each row execute function private.guard_archived_service_order();
create trigger service_order_events_archive_guard before insert or update or delete on public.service_order_events
  for each row execute function private.guard_archived_service_order();
create trigger service_order_images_archive_guard before insert or update or delete on public.service_order_images
  for each row execute function private.guard_archived_service_order();

create or replace function public.list_service_orders(p_status text default null, p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  if p_status is not null and p_status not in ('OPEN','IN_PROGRESS','WAITING','COMPLETED','ARCHIVED') then
    raise exception using errcode = '22023', message = 'Estado inválido.';
  end if;
  if p_status = 'ARCHIVED' then perform private.require_permission('os.manage'); end if;
  return coalesce((select jsonb_agg(to_jsonb(x) - 'sort_rank' - 'priority_rank'
    order by x.sort_rank, x.priority_rank, x.due_date nulls last, x.created_at desc) from (
    select o.id,o.number,o.title,o.location_label,o.priority,o.status,o.due_date,o.created_at,
      coalesce(u.full_name,u.email) as principal_name,
      b.description as waiting_for, b.kind as waiting_kind,
      case when o.status = 'WAITING' and b.kind = 'MATERIAL' then 0
        when o.status = 'WAITING' then 1 when o.status = 'IN_PROGRESS' then 2
        when o.status = 'OPEN' then 3 else 4 end as sort_rank,
      case o.priority when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end as priority_rank
    from public.service_orders o
    join public.users u on u.id = o.principal_id and u.tenant_id = o.tenant_id
    left join lateral (select blocker.description, blocker.kind from public.service_order_blockers blocker
      where blocker.tenant_id = o.tenant_id and blocker.order_id = o.id and blocker.resolved_at is null
      order by case when blocker.kind = 'MATERIAL' then 0 else 1 end, blocker.created_at limit 1) b on true
    where o.tenant_id = v_tenant and
      ((p_status = 'ARCHIVED' and o.archived_at is not null) or
       (p_status is distinct from 'ARCHIVED' and o.archived_at is null and (p_status is null or o.status = p_status)))
    order by sort_rank, priority_rank, o.due_date nulls last, o.created_at desc
    limit least(greatest(coalesce(p_limit,100),1),200)
  ) x), '[]'::jsonb);
end; $$;

create or replace function public.get_service_order_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select jsonb_build_object(
    'open',count(*) filter(where status = 'OPEN'),
    'in_progress',count(*) filter(where status = 'IN_PROGRESS'),
    'waiting',count(*) filter(where status = 'WAITING'),
    'completed',count(*) filter(where status = 'COMPLETED'),
    'urgent',coalesce((select jsonb_agg(to_jsonb(x) - 'sort_rank' - 'priority_rank'
      order by x.sort_rank, x.priority_rank, x.due_date nulls last, x.created_at desc) from (
      select o.id,o.number,o.title,o.location_label,o.status,o.priority,o.due_date,o.created_at,
        b.description as waiting_for, b.kind as waiting_kind,
        case when o.status = 'WAITING' and b.kind = 'MATERIAL' then 0
          when o.status = 'WAITING' then 1 when o.status = 'IN_PROGRESS' then 2
          when o.status = 'OPEN' then 3 else 4 end as sort_rank,
        case o.priority when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end as priority_rank
      from public.service_orders o
      left join lateral (select blocker.description, blocker.kind from public.service_order_blockers blocker
        where blocker.tenant_id = o.tenant_id and blocker.order_id = o.id and blocker.resolved_at is null
        order by case when blocker.kind = 'MATERIAL' then 0 else 1 end, blocker.created_at limit 1) b on true
      where o.tenant_id = v_tenant and o.archived_at is null
      order by sort_rank, priority_rank, o.due_date nulls last, o.created_at desc limit 5
    ) x),'[]'::jsonb)
  ) from public.service_orders where tenant_id = v_tenant and archived_at is null);
end; $$;

-- Mantém a composição anterior das etapas e do histórico; restringe a OS arquivada.
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
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id limit 1) as depends_on_title,
        (select prerequisite.completed_at is not null from public.service_order_step_dependencies d
          join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
            and prerequisite.tenant_id = d.tenant_id
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id limit 1) as depends_on_completed
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
  ) from public.service_orders o
    join public.users u on u.id = o.principal_id and u.tenant_id = o.tenant_id
    where o.id = p_order_id and o.tenant_id = v_tenant
      and (o.archived_at is null or private.has_permission('os.manage')));
end; $$;

revoke all on function public.archive_service_order(uuid), public.restore_service_order(uuid) from public, anon, authenticated;
grant execute on function public.archive_service_order(uuid), public.restore_service_order(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
