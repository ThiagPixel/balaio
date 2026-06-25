-- =====================================================
-- StockFlow - Row Level Security (multi-tenant)
-- =====================================================
-- Todas as policies usam auth.jwt() ->> 'tenant_id'
-- O claim 'tenant_id' é injetado via custom_access_token_hook
-- (ver 0003_auth_triggers.sql)
-- =====================================================

-- Habilitar RLS
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.transactions enable row level security;

-- -----------------------------------------------------
-- Helper: ler tenant_id do JWT
-- -----------------------------------------------------
create or replace function public.get_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
    ''
  )::uuid;
$$;

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
