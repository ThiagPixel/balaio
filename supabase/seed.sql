-- =====================================================
-- StockFlow - Seed de dados de exemplo
-- =====================================================
-- Use APENAS em ambiente de desenvolvimento/testes.
-- Cria um tenant de exemplo com produtos e lançamentos.
-- ATENÇÃO: este seed NÃO cria usuários de auth — você
-- precisa ter se cadastrado no app pelo menos uma vez
-- para que seu user esteja em public.users.
-- =====================================================

-- Você precisa substituir 'YOUR_TENANT_ID' pelo id do
-- tenant do seu usuário (após o primeiro signup).
-- Busque em Authentication > Users ou:
--   select id, tenant_id, email from public.users;

do $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
begin
  -- Pega o primeiro user cadastrado (substitua por where email='voce@email.com')
  select id, tenant_id into v_user_id, v_tenant_id
  from public.users
  order by created_at asc
  limit 1;

  if v_tenant_id is null then
    raise notice 'Nenhum usuário encontrado. Faça signup no app primeiro.';
    return;
  end if;

  raise notice 'Semeando dados para tenant %', v_tenant_id;

  -- Produtos
  insert into public.products (tenant_id, name, sku, unit, cost_price, sale_price, min_stock, current_stock)
  values
    (v_tenant_id, 'Notebook Dell Inspiron', 'NB-DELL-001', 'un', 3500, 4990, 2, 5),
    (v_tenant_id, 'Mouse Logitech MX', 'MS-LOG-MX3', 'un', 280, 449, 5, 12),
    (v_tenant_id, 'Teclado Mecânico Keychron', 'KB-KEY-K2', 'un', 450, 799, 3, 8),
    (v_tenant_id, 'Monitor LG 27" 4K', 'MN-LG-27-4K', 'un', 1800, 2799, 1, 3),
    (v_tenant_id, 'Cabo HDMI 2m', 'CB-HDMI-2M', 'un', 15, 39.9, 20, 50);

  -- Lançamentos financeiros (a pagar)
  insert into public.transactions (tenant_id, type, category, description, amount, due_date, status)
  values
    (v_tenant_id, 'EXPENSE', 'Aluguel', 'Aluguel do escritório', 3500, current_date + 5, 'PENDING'),
    (v_tenant_id, 'EXPENSE', 'Energia', 'Conta de luz', 480, current_date + 10, 'PENDING'),
    (v_tenant_id, 'EXPENSE', 'Internet', 'Mensalidade internet', 199.9, current_date - 2, 'PENDING'),
    (v_tenant_id, 'EXPENSE', 'Fornecedores', 'Reposição de estoque Dell', 12000, current_date + 15, 'PENDING');

  -- Lançamentos financeiros (a receber)
  insert into public.transactions (tenant_id, type, category, description, amount, due_date, status)
  values
    (v_tenant_id, 'INCOME', 'Vendas', 'Venda - Cliente A', 4990, current_date + 3, 'PENDING'),
    (v_tenant_id, 'INCOME', 'Vendas', 'Venda - Cliente B', 1299, current_date + 7, 'PENDING'),
    (v_tenant_id, 'INCOME', 'Serviços', 'Consultoria - Empresa X', 2500, current_date - 5, 'PAID');

  raise notice 'Seed concluído!';
end $$;
