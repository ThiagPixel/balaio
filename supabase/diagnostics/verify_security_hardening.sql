-- Execute após 0023 no SQL Editor. Todas as linhas devem retornar passed = true.
select 'anon só executa a consulta pública de convite' as check_name,
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f'
      and p.proname <> 'get_member_invitation_public'
      and not exists (
        select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid and d.deptype = 'e'
      )
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) as passed
union all
select 'RPC antiga de estoque bloqueada',
  not has_function_privilege('authenticated',
    'public.execute_stock_movement(uuid,uuid,text,integer,numeric,text,integer)', 'EXECUTE')
union all
select 'cadastro antigo bloqueado',
  not has_function_privilege('authenticated',
    'public.create_tenant_with_admin(text,text,uuid,text,text)', 'EXECUTE')
union all
select 'sem escrita direta em usuários e empresa',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(name)
    where n.nspname = 'public' and c.relname in ('users', 'tenants')
      and (has_table_privilege('authenticated', c.oid, privileges.name)
        or case when privileges.name = 'DELETE' then false else
          has_any_column_privilege('authenticated', c.oid, privileges.name) end)
  )
union all
select 'sem acesso direto às tabelas de negócio',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(name)
    where n.nspname = 'public' and c.relname in ('products', 'stock_movements', 'transactions')
      and (has_table_privilege('authenticated', c.oid, privileges.name)
        or case when privileges.name = 'DELETE' then false else
          has_any_column_privilege('authenticated', c.oid, privileges.name) end)
  )
union all
select 'funções públicas SECURITY DEFINER acessíveis usam search_path vazio',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not coalesce(p.proconfig @> array['search_path=""'], false)
  )
union all
select 'políticas antigas removidas',
  not exists (
    select 1 from pg_policies where schemaname = 'public'
      and policyname in ('users_update_self', 'users_select_own_tenant',
        'tenants_select_own', 'tenants_update_own', 'products_all',
        'stock_movements_all', 'transactions_all')
  )
union all
select 'uploads usam a política restrita',
  exists (select 1 from pg_policies where schemaname = 'storage'
    and tablename = 'objects' and policyname = 'product_images_insert_authorized')
  and not exists (select 1 from pg_policies where schemaname = 'storage'
    and tablename = 'objects' and policyname in (
      'Authenticated users can upload product images',
      'Allow authenticated uploads to product-images'
    ));
