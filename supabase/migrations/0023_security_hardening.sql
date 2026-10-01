-- Correção baseada no inventário do banco enviado em 2026-10-01.
-- Aplicar após publicar o upload com prefixo user.id/ no cliente.
-- Não reconstrói as migrations ausentes. Não altera registros existentes.
begin;
set local lock_timeout = '5s';
revoke create on schema public from public, anon, authenticated;

-- Falha antes de modificar objetos se os helpers do ambiente não existirem.
do $$
begin
  if to_regprocedure('private.current_tenant_id()') is null
    or to_regprocedure('private.has_permission(text)') is null
    or to_regprocedure('public.execute_stock_movement(uuid,text,integer,numeric,text)') is null
  then
    raise exception 'Schema incompatível: recupere os helpers e a RPC atual de estoque.';
  end if;
end;
$$;

-- Helper interno. Chamado por RPCs SECURITY DEFINER, sem execução direta do cliente.
create or replace function private.require_permission(p_permission_key text)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  v_tenant_id := private.current_tenant_id();
  if auth.uid() is null or v_tenant_id is null
    or not private.has_permission(p_permission_key) then
    raise exception using errcode = '42501',
      message = 'Conta inativa ou sem permissão para esta operação.';
  end if;
  return v_tenant_id;
end;
$$;
revoke all on function private.require_permission(text) from public, anon, authenticated;

create or replace function public.get_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select private.current_tenant_id(); $$;

-- Mesmas assinaturas e tipos de retorno das RPCs existentes.
create or replace function public.create_product(
  p_name text, p_sku text, p_description text, p_image_url text, p_unit text,
  p_cost_price numeric, p_sale_price numeric, p_min_stock integer, p_current_stock integer
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_product_id uuid;
begin
  v_tenant_id := private.require_permission('products.create');
  if coalesce(p_cost_price, 0) <> 0 then
    perform private.require_permission('products.view_cost');
  end if;
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_unit), '') is null
    or p_cost_price is null or p_sale_price is null
    or p_cost_price < 0 or p_sale_price < 0
    or p_cost_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_sale_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_min_stock is null or p_min_stock < 0
    or p_current_stock is null or p_current_stock < 0 then
    raise exception using errcode = '22023', message = 'Dados de produto inválidos.';
  end if;
  insert into public.products (
    tenant_id, name, sku, description, image_url, unit,
    cost_price, sale_price, min_stock, current_stock
  ) values (
    v_tenant_id, btrim(p_name), nullif(btrim(p_sku), ''),
    nullif(btrim(p_description), ''), nullif(btrim(p_image_url), ''), btrim(p_unit),
    p_cost_price, p_sale_price, p_min_stock, p_current_stock
  ) returning id into v_product_id;
  return v_product_id;
end;
$$;

create or replace function public.update_product(
  p_product_id uuid, p_name text, p_sku text, p_description text,
  p_image_url text, p_unit text, p_sale_price numeric, p_min_stock integer, p_cost_price numeric
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  v_tenant_id := private.require_permission('products.update');
  if p_cost_price is not null then
    perform private.require_permission('products.view_cost');
  end if;
  if p_product_id is null or nullif(btrim(p_name), '') is null
    or nullif(btrim(p_unit), '') is null
    or p_sale_price is null or p_sale_price < 0
    or p_sale_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_cost_price < 0 or p_cost_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_min_stock is null or p_min_stock < 0 then
    raise exception using errcode = '22023', message = 'Dados de produto inválidos.';
  end if;
  update public.products p
  set name = btrim(p_name), sku = nullif(btrim(p_sku), ''),
      description = nullif(btrim(p_description), ''), image_url = nullif(btrim(p_image_url), ''),
      unit = btrim(p_unit), sale_price = p_sale_price, min_stock = p_min_stock,
      cost_price = coalesce(p_cost_price, p.cost_price)
  where p.id = p_product_id and p.tenant_id = v_tenant_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Produto não encontrado nesta empresa.';
  end if;
end;
$$;

create or replace function public.get_product(p_product_id uuid)
returns table (
  id uuid, tenant_id uuid, name text, sku text, description text, image_url text,
  unit text, cost_price numeric, sale_price numeric, min_stock integer,
  current_stock integer, active boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_can_view_cost boolean;
begin
  v_tenant_id := private.require_permission('products.view');
  v_can_view_cost := private.has_permission('products.view_cost');
  return query select p.id, p.tenant_id, p.name, p.sku, p.description, p.image_url,
    p.unit, case when v_can_view_cost then p.cost_price else null::numeric end,
    p.sale_price, p.min_stock, p.current_stock, p.active, p.created_at, p.updated_at
  from public.products p where p.id = p_product_id and p.tenant_id = v_tenant_id;
end;
$$;

create or replace function public.list_products(p_query text)
returns table (
  id uuid, tenant_id uuid, name text, sku text, description text, image_url text,
  unit text, cost_price numeric, sale_price numeric, min_stock integer,
  current_stock integer, active boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_can_view_cost boolean;
begin
  v_tenant_id := private.require_permission('products.view');
  v_can_view_cost := private.has_permission('products.view_cost');
  return query select p.id, p.tenant_id, p.name, p.sku, p.description, p.image_url,
    p.unit, case when v_can_view_cost then p.cost_price else null::numeric end,
    p.sale_price, p.min_stock, p.current_stock, p.active, p.created_at, p.updated_at
  from public.products p
  where p.tenant_id = v_tenant_id
    and (p_query is null or btrim(p_query) = ''
      or p.name ilike '%' || p_query || '%' or p.sku ilike '%' || p_query || '%')
  order by p.name;
end;
$$;

create or replace function public.update_company_settings(p_name text, p_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  v_tenant_id := private.require_permission('settings.update');
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_slug), '') is null then
    raise exception using errcode = '22023', message = 'Nome e identificador da empresa são obrigatórios.';
  end if;
  update public.tenants set name = btrim(p_name), slug = btrim(p_slug) where id = v_tenant_id;
end;
$$;

-- Consulta do totem/mobile: só produtos ativos, sem custos, com permissão de retirada.
create or replace function public.list_withdrawal_products()
returns table (id uuid, name text, sku text, current_stock integer, min_stock integer)
language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  v_tenant_id := private.require_permission('stock.out');
  return query select p.id, p.name, p.sku, p.current_stock, p.min_stock
    from public.products p where p.tenant_id = v_tenant_id and p.active = true
    order by p.name;
end;
$$;
revoke all on function public.list_withdrawal_products() from public, anon, authenticated;
grant execute on function public.list_withdrawal_products() to authenticated;

create or replace function public.create_financial_transaction(
  p_type text, p_category text, p_description text, p_amount numeric, p_due_date date,
  p_status text default 'PENDING', p_paid_at date default null, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_id uuid;
begin
  v_tenant_id := private.require_permission('finance.create');
  if p_type is null or p_type not in ('INCOME', 'EXPENSE')
    or p_status is null or p_status not in ('PENDING', 'PAID', 'CANCELLED')
    or nullif(btrim(p_category), '') is null or nullif(btrim(p_description), '') is null
    or p_amount is null or p_amount <= 0 or p_amount::text in ('NaN', 'Infinity', '-Infinity')
    or p_due_date is null or not isfinite(p_due_date)
    or (p_paid_at is not null and not isfinite(p_paid_at)) then
    raise exception using errcode = '22023', message = 'Dados financeiros inválidos.';
  end if;
  if p_status = 'PAID' then perform private.require_permission('finance.settle'); end if;
  if p_status = 'CANCELLED' then perform private.require_permission('finance.cancel'); end if;
  insert into public.transactions (
    tenant_id, type, category, description, amount, due_date, status, paid_at, notes,
    created_by, updated_by
  ) values (
    v_tenant_id, p_type, btrim(p_category), btrim(p_description), p_amount, p_due_date,
    p_status, case when p_status = 'PAID' then coalesce(p_paid_at, current_date) else null end,
    nullif(btrim(p_notes), ''), auth.uid(), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_financial_transaction_status(p_transaction_id uuid, p_target_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_permission text;
begin
  v_permission := case p_target_status when 'PAID' then 'finance.settle'
    when 'PENDING' then 'finance.reopen' when 'CANCELLED' then 'finance.cancel' end;
  if v_permission is null then
    raise exception using errcode = '22023', message = 'Status financeiro inválido.';
  end if;
  v_tenant_id := private.require_permission(v_permission);
  update public.transactions set status = p_target_status,
    paid_at = case when p_target_status = 'PAID' then coalesce(paid_at, current_date) else null end,
    updated_by = auth.uid()
  where id = p_transaction_id and tenant_id = v_tenant_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Lançamento não encontrado nesta empresa.';
  end if;
end;
$$;

create or replace function public.delete_financial_transaction(p_transaction_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  v_tenant_id := private.require_permission('finance.delete');
  delete from public.transactions where id = p_transaction_id and tenant_id = v_tenant_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Lançamento não encontrado nesta empresa.';
  end if;
end;
$$;

-- Remove acesso direto: leituras e mutations de negócio passam pelas RPCs.
-- REVOKE em tabela não remove grants independentes por coluna; removemos ambos.
do $$
declare t text; cols text;
begin
  foreach t in array array['products','stock_movements','transactions','users','tenants'] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into cols
    from pg_attribute a where a.attrelid = format('public.%I', t)::regclass
      and a.attnum > 0 and not a.attisdropped;
    execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.%I from public, anon, authenticated', cols, cols, cols, cols, t);
  end loop;
end;
$$;
-- O layout consulta o nome da empresa; leitura de users mantém as políticas atuais seguras.
grant select on public.tenants, public.users to authenticated;

drop policy if exists tenants_select_own on public.tenants;
drop policy if exists tenants_update_own on public.tenants;
drop policy if exists users_select_own_tenant on public.users;
drop policy if exists users_update_self on public.users;
drop policy if exists products_all on public.products;
drop policy if exists stock_movements_all on public.stock_movements;
drop policy if exists transactions_all on public.transactions;

-- Desativa as assinaturas antigas sem apagar funções ou dependências.
revoke all on function public.create_tenant_with_admin(text,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.execute_stock_movement(uuid,uuid,text,integer,numeric,text,integer) from public, anon, authenticated;

-- Permissão de execução explicitamente restrita nas RPCs corrigidas.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'get_tenant_id','create_product','update_product','get_product','list_products',
      'update_company_settings','get_dashboard_stock_summary','get_dashboard_financial_summary',
      'create_financial_transaction','set_financial_transaction_status','delete_financial_transaction'
    ) loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;

-- As policies permissivas antigas se somam com OR; ambas as variantes são removidas.
drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Allow authenticated uploads to product-images" on storage.objects;
drop policy if exists "Users can delete their own product images" on storage.objects;
drop policy if exists "Allow owner delete of product-images" on storage.objects;
drop policy if exists product_images_insert_authorized on storage.objects;
drop policy if exists product_images_delete_authorized on storage.objects;
create policy product_images_insert_authorized on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (public.has_permission('products.create') or public.has_permission('products.update'))
);
create policy product_images_delete_authorized on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (public.has_permission('products.create') or public.has_permission('products.update'))
);

-- Novas funções criadas por postgres precisam de GRANT explícito para acesso pela API.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Os indicadores e as proteções contra delegação excessiva são definidos abaixo.
-- A transação só é confirmada após essas definições e as verificações finais.
CREATE OR REPLACE FUNCTION public.get_dashboard_stock_summary()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant_id uuid;
  v_count integer;
  v_low json;
begin

  perform private.require_permission('dashboard.view');
  perform private.require_permission('dashboard.view_stock');

  select tenant_id into v_tenant_id
  from public.users
  where id = auth.uid();

  if v_tenant_id is null then
    return json_build_object('products_count', 0, 'low_stock', '[]'::json);
  end if;

  select count(*) into v_count
  from public.products
  where tenant_id = v_tenant_id and active = true;

  select coalesce(json_agg(row_to_json(s)), '[]'::json) into v_low
  from (
    select id, name, current_stock, min_stock
    from public.products
    where tenant_id = v_tenant_id
      and active = true
      and current_stock < min_stock
    order by (min_stock - current_stock) desc
    limit 10
  ) s;

  return json_build_object('products_count', v_count, 'low_stock', v_low);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_dashboard_financial_summary()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant_id uuid;
  v_income_received numeric;
  v_expense_paid numeric;
  v_income_pending numeric;
  v_expense_pending numeric;
  v_overdue json;
  v_upcoming json;
begin

  perform private.require_permission('dashboard.view');
  perform private.require_permission('dashboard.view_financial');

  select tenant_id into v_tenant_id
  from public.users
  where id = auth.uid();

  if v_tenant_id is null then
    return json_build_object(
      'income_received', 0, 'expense_paid', 0,
      'income_pending', 0, 'expense_pending', 0, 'balance', 0,
      'overdue', '[]'::json, 'upcoming', '[]'::json
    );
  end if;

  select coalesce(sum(amount), 0) into v_income_received
  from public.transactions
  where tenant_id = v_tenant_id and type = 'INCOME' and status = 'PAID';

  select coalesce(sum(amount), 0) into v_expense_paid
  from public.transactions
  where tenant_id = v_tenant_id and type = 'EXPENSE' and status = 'PAID';

  select coalesce(sum(amount), 0) into v_income_pending
  from public.transactions
  where tenant_id = v_tenant_id and type = 'INCOME' and status = 'PENDING';

  select coalesce(sum(amount), 0) into v_expense_pending
  from public.transactions
  where tenant_id = v_tenant_id and type = 'EXPENSE' and status = 'PENDING';

  select coalesce(json_agg(row_to_json(o)), '[]'::json) into v_overdue
  from (
    select id, description, amount, due_date
    from public.transactions
    where tenant_id = v_tenant_id
      and status = 'PENDING'
      and due_date < current_date
    order by due_date asc
    limit 10
  ) o;

  select coalesce(json_agg(row_to_json(u)), '[]'::json) into v_upcoming
  from (
    select id, type, description, amount, due_date
    from public.transactions
    where tenant_id = v_tenant_id
      and status = 'PENDING'
      and due_date >= current_date
      and due_date <= current_date + 7
    order by due_date asc
    limit 10
  ) u;

  return json_build_object(
    'income_received', v_income_received,
    'expense_paid',    v_expense_paid,
    'income_pending',  v_income_pending,
    'expense_pending', v_expense_pending,
    'balance',         v_income_received - v_expense_paid,
    'overdue',         v_overdue,
    'upcoming',        v_upcoming
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_member_permissions(p_member_id uuid, p_permission_keys text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant_id uuid;
  v_member_role text;
  v_permission_keys text[];
begin
  -- Um membro não pode conceder permissões que ele próprio não possui.
  if exists (
    select 1 from unnest(coalesce(p_permission_keys, array[]::text[])) as requested(permission_key)
    where not private.has_permission(requested.permission_key)
  ) then
    raise exception using errcode = '42501',
      message = 'Você não pode conceder permissões que não possui.';
  end if;
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  if not private.has_permission(
    'members.permissions'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Você não possui permissão para administrar permissões.';
  end if;

  if p_member_id is null then
    raise exception using
      errcode = '22004',
      message = 'Usuário não informado.';
  end if;

  v_tenant_id := private.current_tenant_id();

  if v_tenant_id is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário sem empresa ativa.';
  end if;

  select app_user.role
  into v_member_role
  from public.users as app_user
  where app_user.id = p_member_id
    and app_user.tenant_id = v_tenant_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Usuário não encontrado nesta empresa.';
  end if;

  if v_member_role = 'owner' then
    raise exception using
      errcode = '42501',
      message = 'As permissões do proprietário não podem ser alteradas.';
  end if;

  v_permission_keys :=
    coalesce(
      p_permission_keys,
      array[]::text[]
    );

  if exists (
    select 1
    from unnest(v_permission_keys)
      as requested_permission(key)

    left join public.permissions
      as permission
      on permission.key =
        requested_permission.key
      and permission.assignable_to_member = true

    where permission.key is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'Uma ou mais permissões são inválidas ou não podem ser atribuídas.';
  end if;

  delete from private.user_permissions
  where user_id = p_member_id;

  insert into private.user_permissions (
    user_id,
    permission_key,
    granted_by
  )
  select distinct
    p_member_id,
    requested_permission.key,
    auth.uid()
  from unnest(v_permission_keys)
    as requested_permission(key);

  return jsonb_build_object(
    'member_id',
    p_member_id,

    'permissions',
    to_jsonb(v_permission_keys)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_member_invitation(p_email text, p_token_hash text, p_permission_keys text[], p_expires_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant_id uuid;
  v_email text;
  v_permission_keys text[];
  v_invitation_id uuid;
begin
  -- Um membro não pode conceder permissões que ele próprio não possui.
  if exists (
    select 1 from unnest(coalesce(p_permission_keys, array[]::text[])) as requested(permission_key)
    where not private.has_permission(requested.permission_key)
  ) then
    raise exception using errcode = '42501',
      message = 'Você não pode conceder permissões que não possui.';
  end if;
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  if not private.has_permission(
    'members.invite'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Você não possui permissão para convidar usuários.';
  end if;

  v_tenant_id :=
    private.current_tenant_id();

  if v_tenant_id is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário sem empresa ativa.';
  end if;

  v_email :=
    lower(nullif(btrim(p_email), ''));

  if v_email is null then
    raise exception using
      errcode = '22023',
      message = 'E-mail obrigatório.';
  end if;

  if v_email !~
    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'E-mail inválido.';
  end if;

  if p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception using
      errcode = '22023',
      message = 'Token de convite inválido.';
  end if;

  if p_expires_at is null
    or p_expires_at <= now()
  then
    raise exception using
      errcode = '22023',
      message = 'A validade do convite é inválida.';
  end if;

  if p_expires_at > now() + interval '30 days'
  then
    raise exception using
      errcode = '22023',
      message = 'O convite não pode durar mais que 30 dias.';
  end if;

  if exists (
    select 1
    from public.users as app_user
    where lower(app_user.email) = v_email
  ) then
    raise exception using
      errcode = '23505',
      message = 'Este e-mail já está vinculado a uma empresa.';
  end if;

  select coalesce(
    array_agg(
      distinct requested.permission_key
      order by requested.permission_key
    ),
    array[]::text[]
  )
  into v_permission_keys
  from unnest(
    coalesce(
      p_permission_keys,
      array[]::text[]
    )
  ) as requested(permission_key);

  if exists (
    select 1
    from unnest(v_permission_keys)
      as requested(permission_key)

    left join public.permissions
      as permission
      on permission.key =
        requested.permission_key
      and permission.assignable_to_member = true

    where permission.key is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'Uma ou mais permissões não podem ser atribuídas.';
  end if;

  update private.member_invitations
  set
    status = 'REVOKED',
    revoked_at = now(),
    updated_at = now()
  where tenant_id = v_tenant_id
    and lower(email) = v_email
    and status = 'PENDING';

  insert into private.member_invitations (
    tenant_id,
    email,
    token_hash,
    permission_keys,
    invited_by,
    expires_at
  )
  values (
    v_tenant_id,
    v_email,
    p_token_hash,
    v_permission_keys,
    auth.uid(),
    p_expires_at
  )
  returning id
  into v_invitation_id;

  return v_invitation_id;
end;
$function$
;

alter function public.set_updated_at() set search_path = '';
alter function public.update_updated_at_column() set search_path = '';
revoke all on function public.update_updated_at_column() from public, anon, authenticated;

-- Verificação estrutural antes de confirmar a transação.
do $$
begin
  if has_function_privilege('anon', 'public.create_product(text,text,text,text,text,numeric,numeric,integer,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.execute_stock_movement(uuid,uuid,text,integer,numeric,text,integer)', 'EXECUTE')
    or has_function_privilege('anon', 'public.create_tenant_with_admin(text,text,uuid,text,text)', 'EXECUTE')
    or has_table_privilege('authenticated', 'public.users', 'UPDATE')
    or has_any_column_privilege('authenticated', 'public.users', 'UPDATE')
    or has_table_privilege('authenticated', 'public.products', 'SELECT')
    or has_any_column_privilege('authenticated', 'public.products', 'SELECT')
  then
    raise exception 'Privilégios inseguros ainda presentes; a migration foi cancelada.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
