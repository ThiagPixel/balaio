-- Saldo atual de um produto selecionado no relatório; não é saldo histórico.
begin;
set local lock_timeout = '5s';

create function public.get_report_product_current_stock(p_product_id uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_stock integer;
begin
  v_tenant := private.require_permission('stock.view');
  select p.current_stock into v_stock from public.products p
  where p.id = p_product_id and p.tenant_id = v_tenant;
  if not found then
    raise exception using errcode = 'P0002', message = 'Produto não encontrado nesta empresa.';
  end if;
  return v_stock;
end; $$;

revoke all on function public.get_report_product_current_stock(uuid)
  from public, anon, authenticated;
grant execute on function public.get_report_product_current_stock(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
