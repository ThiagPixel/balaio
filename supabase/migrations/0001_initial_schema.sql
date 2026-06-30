-- =====================================================
-- Balaio - Schema inicial
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase
-- (Database > SQL Editor > New query)
-- =====================================================

-- Extensões necessárias
create extension if not exists "pgcrypto";

-- -----------------------------------------------------
-- Tenants (empresas)
-- -----------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- Users (vinculado a auth.users e tenants)
-- -----------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_tenant_id on public.users(tenant_id);

-- -----------------------------------------------------
-- Products (produtos)
-- -----------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sku text,
  description text,
  unit text not null default 'un',
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  min_stock integer not null default 0,
  current_stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create index if not exists idx_products_tenant_id on public.products(tenant_id);

-- -----------------------------------------------------
-- Stock movements (movimentações de estoque)
-- -----------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('IN', 'OUT', 'ADJUST')),
  quantity integer not null,
  unit_cost numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_tenant_id on public.stock_movements(tenant_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);

-- -----------------------------------------------------
-- Transactions (contas a pagar e receber)
-- -----------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('INCOME', 'EXPENSE')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  paid_at date,
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_tenant_id on public.transactions(tenant_id);
create index if not exists idx_transactions_due_date on public.transactions(due_date);

-- -----------------------------------------------------
-- Trigger: atualiza updated_at automaticamente
-- -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
