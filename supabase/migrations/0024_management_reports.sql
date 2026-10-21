-- Relatórios do Balaio: somente dados já registrados no estoque e financeiro.
-- Execute depois de 0023. Não altera movimentos/lançamentos existentes.
begin;
set local lock_timeout = '5s';

create index if not exists idx_stock_movements_tenant_created
  on public.stock_movements (tenant_id, created_at);
create index if not exists idx_transactions_tenant_paid
  on public.transactions (tenant_id, paid_at)
  where status = 'PAID';

create or replace function public.list_report_products()
returns table(id uuid, name text, unit text)
language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('stock.view');
  return query select p.id, p.name, p.unit from public.products p
    where p.tenant_id = v_tenant order by lower(p.name), p.id;
end;
$$;

create or replace function public.get_stock_report(
  p_start date, p_end date, p_product_id uuid default null,
  p_type text default null
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tenant uuid;
  v_result jsonb;
begin
  v_tenant := private.require_permission('stock.view');
  if p_start is null or p_end is null or p_end < p_start
     or p_end > p_start + 1096 then
    raise exception using errcode = '22023',
      message = 'Informe um período válido de até três anos.';
  end if;
  if p_product_id is not null and not exists (
    select 1 from public.products p
    where p.id = p_product_id and p.tenant_id = v_tenant
  ) then
    raise exception using errcode = '22023', message = 'Produto inválido.';
  end if;
  if p_type is not null and p_type not in ('IN', 'OUT', 'ADJUST') then
    raise exception using errcode = '22023', message = 'Tipo de movimentação inválido.';
  end if;

  with scoped as (
    select m.type, m.quantity, m.created_at, p.id as product_id,
           p.name as product_name, p.unit as product_unit,
           (m.created_at at time zone 'America/Sao_Paulo')::date as local_date
    from public.stock_movements m
    join public.products p on p.id = m.product_id and p.tenant_id = m.tenant_id
    where m.tenant_id = v_tenant
      and m.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and m.created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
      and (p_product_id is null or m.product_id = p_product_id)
      and (p_type is null or m.type = p_type)
  ),
  totals as (
    select count(*) as records,
           count(distinct local_date) as active_days,
           count(*) filter (where type = 'ADJUST') as adjustments,
           coalesce(sum(quantity) filter (where type = 'IN'), 0) as incoming,
           coalesce(sum(quantity) filter (where type = 'OUT'), 0) as outgoing
    from scoped
  ),
  by_month as (
    select date_trunc('month', local_date)::date as month,
           coalesce(sum(quantity) filter (where type = 'IN'), 0) as incoming,
           coalesce(sum(quantity) filter (where type = 'OUT'), 0) as outgoing,
           count(*) filter (where type = 'ADJUST') as adjustments
    from scoped group by 1
  ),
  by_product as (
    select product_id, product_name, product_unit,
           coalesce(sum(quantity) filter (where type = 'IN'), 0) as incoming,
           coalesce(sum(quantity) filter (where type = 'OUT'), 0) as outgoing,
           count(*) filter (where type = 'ADJUST') as adjustments
    from scoped group by product_id, product_name, product_unit
  )
  select jsonb_build_object(
    'records', totals.records, 'active_days', totals.active_days,
    'adjustments', totals.adjustments,
    'incoming', case when p_product_id is not null then totals.incoming end,
    'outgoing', case when p_product_id is not null then totals.outgoing end,
    'months', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', bm.month,
        'incoming', case when p_product_id is not null then bm.incoming end,
        'outgoing', case when p_product_id is not null then bm.outgoing end,
        'adjustments', bm.adjustments
      ) order by bm.month) from by_month bm
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bp.product_id, 'name', bp.product_name, 'unit', bp.product_unit,
        'incoming', bp.incoming, 'outgoing', bp.outgoing,
        'adjustments', bp.adjustments
      ) order by bp.product_unit, bp.outgoing desc, bp.product_name)
      from by_product bp
    ), '[]'::jsonb)
  ) into v_result from totals;
  return v_result;
end;
$$;

create or replace function public.get_financial_report(p_start date, p_end date)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tenant uuid;
  v_result jsonb;
begin
  v_tenant := private.require_permission('finance.view');
  if p_start is null or p_end is null or p_end < p_start
     or p_end > p_start + 1096 then
    raise exception using errcode = '22023',
      message = 'Informe um período válido de até três anos.';
  end if;

  with settled as (
    select t.type, t.amount, t.category, t.paid_at
    from public.transactions t
    where t.tenant_id = v_tenant and t.status = 'PAID'
      and t.paid_at between p_start and p_end
  ), totals as (
    select count(*) as records,
      coalesce(sum(amount) filter (where type = 'INCOME'), 0) as received,
      coalesce(sum(amount) filter (where type = 'EXPENSE'), 0) as paid
    from settled
  ), by_month as (
    select date_trunc('month', paid_at)::date as month,
      coalesce(sum(amount) filter (where type = 'INCOME'), 0) as received,
      coalesce(sum(amount) filter (where type = 'EXPENSE'), 0) as paid
    from settled group by 1
  ), by_category as (
    select category, type, sum(amount) as total
    from settled group by category, type
  )
  select jsonb_build_object(
    'records', totals.records, 'received', totals.received,
    'paid', totals.paid, 'balance', totals.received - totals.paid,
    'months', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', bm.month, 'received', bm.received, 'paid', bm.paid
      ) order by bm.month) from by_month bm
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', bc.category, 'type', bc.type, 'total', bc.total
      ) order by bc.total desc, bc.category) from by_category bc
    ), '[]'::jsonb)
  ) into v_result from totals;
  return v_result;
end;
$$;

revoke all on function public.get_stock_report(date,date,uuid,text) from public, anon, authenticated;
revoke all on function public.get_financial_report(date,date) from public, anon, authenticated;
revoke all on function public.list_report_products() from public, anon, authenticated;
grant execute on function public.get_stock_report(date,date,uuid,text) to authenticated;
grant execute on function public.get_financial_report(date,date) to authenticated;
grant execute on function public.list_report_products() to authenticated;
notify pgrst, 'reload schema';
commit;
