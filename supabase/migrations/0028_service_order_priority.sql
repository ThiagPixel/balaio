-- Atualiza apenas consultas de OS. Pode ser aplicada após 0027 sem alterar registros.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.get_service_order_dashboard()') is null then
    raise exception 'A migration 0027 precisa estar aplicada.';
  end if;
end $$;

create or replace function public.list_service_orders(p_status text default null, p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  if p_status is not null and p_status not in ('OPEN','IN_PROGRESS','WAITING','COMPLETED') then
    raise exception using errcode = '22023', message = 'Estado inválido.';
  end if;
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
    where o.tenant_id = v_tenant and (p_status is null or o.status = p_status)
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
      where o.tenant_id = v_tenant
      order by sort_rank, priority_rank, o.due_date nulls last, o.created_at desc limit 5
    ) x),'[]'::jsonb)
  ) from public.service_orders where tenant_id = v_tenant);
end; $$;

revoke all on function public.list_service_orders(text,integer),
  public.get_service_order_dashboard() from public, anon, authenticated;
grant execute on function public.list_service_orders(text,integer),
  public.get_service_order_dashboard() to authenticated;
notify pgrst, 'reload schema';
commit;
