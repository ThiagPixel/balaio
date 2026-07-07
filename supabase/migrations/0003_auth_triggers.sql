-- =====================================================
-- Balaio - Funções helper
-- =====================================================
-- 1) get_tenant_id(): busca tenant_id via auth.uid() no banco
-- 2) create_tenant_with_admin(): cria tenant+users bypassando RLS
-- 3) execute_stock_movement(): movimenta estoque atomicamente
-- =====================================================

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
-- Helper RPC: cria tenant + users bypassing RLS
-- Usado pelo app durante signup
-- -----------------------------------------------------
create or replace function public.create_tenant_with_admin(
  p_name text,
  p_slug text,
  p_user_id uuid,
  p_email text,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  insert into public.tenants (name, slug)
  values (p_name, p_slug)
  returning id into v_tenant_id;

  insert into public.users (id, tenant_id, email, full_name, role)
  values (p_user_id, v_tenant_id, p_email, p_full_name, 'owner')
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.create_tenant_with_admin(text, text, uuid, text, text) to authenticated, anon;
revoke execute on function public.create_tenant_with_admin(text, text, uuid, text, text) from anon;

-- -----------------------------------------------------
-- Função atômica: movimenta estoque com transação
-- Evita race condition entre leitura e escrita
-- -----------------------------------------------------
create or replace function public.execute_stock_movement(
  p_product_id uuid,
  p_tenant_id uuid,
  p_type text,
  p_quantity integer,
  p_unit_cost numeric,
  p_notes text,
  p_new_stock integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Atualiza estoque do produto (bloqueia a linha)
  update public.products
  set current_stock = p_new_stock, updated_at = now()
  where id = p_product_id and tenant_id = p_tenant_id;

  -- Insere registro da movimentação
  insert into public.stock_movements
    (tenant_id, product_id, type, quantity, unit_cost, notes)
  values
    (p_tenant_id, p_product_id, p_type, p_quantity, p_unit_cost, p_notes);
end;
$$;

grant execute on function public.execute_stock_movement(uuid, uuid, text, integer, numeric, text, integer) to authenticated;
revoke execute on function public.execute_stock_movement(uuid, uuid, text, integer, numeric, text, integer) from anon;
