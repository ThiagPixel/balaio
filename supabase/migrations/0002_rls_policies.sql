-- =====================================================
-- Balaio - Row Level Security (multi-tenant)
-- =====================================================
-- Todas as policies usam public.get_tenant_id()
-- que busca tenant_id via auth.uid() no banco
-- =====================================================

-- Habilitar RLS
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.transactions enable row level security;

-- -----------------------------------------------------
-- Helper: get_tenant_id via auth.uid()
-- -----------------------------------------------------
create or replace function public.get_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select u.tenant_id into v_tenant_id
  from public.users u
  where u.id = auth.uid();
  return v_tenant_id;
end;
$$;

grant execute on function public.get_tenant_id() to authenticated;
revoke execute on function public.get_tenant_id() from anon, public;

-- -----------------------------------------------------
-- Tenants: usuário só vê o próprio tenant
-- -----------------------------------------------------
drop policy if exists "tenants_select_own" on public.tenants;
create policy "tenants_select_own" on public.tenants
  for select using (id = public.get_tenant_id());

drop policy if exists "tenants_update_own" on public.tenants;
create policy "tenants_update_own" on public.tenants
  for update using (id = public.get_tenant_id())
  with check (id = public.get_tenant_id());

-- -----------------------------------------------------
-- Users: usuário vê apenas usuários do próprio tenant
-- -----------------------------------------------------
drop policy if exists "users_select_own_tenant" on public.users;
create policy "users_select_own_tenant" on public.users
  for select using (tenant_id = public.get_tenant_id());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
  for update using (id = auth.uid() and tenant_id = public.get_tenant_id())
  with check (id = auth.uid() and tenant_id = public.get_tenant_id());

-- -----------------------------------------------------
-- Products
-- -----------------------------------------------------
drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products
  for all using (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- -----------------------------------------------------
-- Stock movements
-- -----------------------------------------------------
drop policy if exists "stock_movements_all" on public.stock_movements;
create policy "stock_movements_all" on public.stock_movements
  for all using (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- -----------------------------------------------------
-- Transactions
-- -----------------------------------------------------
drop policy if exists "transactions_all" on public.transactions;
create policy "transactions_all" on public.transactions
  for all using (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());
