-- Somente leitura. Copie o valor da coluna security_snapshot para análise.
-- Não inclui registros de clientes, senhas ou chaves de acesso.
with functions as (
  select n.nspname as schema_name, p.proname as function_name,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_functiondef(p.oid) as definition,
         pg_get_userbyid(p.proowner) as owner,
         p.prosecdef as security_definer,
         p.proconfig as settings,
         p.proacl::text as explicit_privileges,
         (select jsonb_object_agg(r.rolname,
                   has_function_privilege(r.oid, p.oid, 'EXECUTE'))
          from pg_roles r
          where r.rolname in ('anon', 'authenticated', 'service_role')) as execution
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prokind = 'f'
    and (n.nspname in ('public', 'private') or p.oid in (
      select t.tgfoid from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace tn on tn.oid = c.relnamespace
      where not t.tgisinternal and tn.nspname in ('auth', 'public', 'private')
    ))
    and not exists (
      select 1 from pg_depend d
      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
    )
), tables as (
  select n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner, c.relacl::text as explicit_privileges
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'storage') and c.relkind in ('r', 'p')
), triggers as (
  select n.nspname as schema_name, c.relname as table_name,
         t.tgname as trigger_name, t.tgenabled as enabled,
         pg_get_triggerdef(t.oid) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname in ('auth', 'public', 'private')
), views as (
  select n.nspname as schema_name, c.relname as view_name,
         c.reloptions as settings, c.relacl::text as explicit_privileges,
         pg_get_viewdef(c.oid, true) as definition
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('v', 'm')
)
select jsonb_pretty(jsonb_build_object(
  'functions', coalesce((select jsonb_agg(to_jsonb(f) order by schema_name, function_name, arguments) from functions f), '[]'::jsonb),
  'tables', coalesce((select jsonb_agg(to_jsonb(t) order by schema_name, table_name) from tables t), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(p) order by schemaname, tablename, policyname) from pg_policies p where schemaname in ('public', 'private', 'storage')), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(t) order by schema_name, table_name, trigger_name) from triggers t), '[]'::jsonb),
  'views', coalesce((select jsonb_agg(to_jsonb(v) order by schema_name, view_name) from views v), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(c) order by table_schema, table_name, ordinal_position) from information_schema.columns c where table_schema in ('public', 'private')), '[]'::jsonb),
  'table_grants', coalesce((select jsonb_agg(to_jsonb(g)) from information_schema.role_table_grants g where table_schema in ('public', 'private') and grantee in ('anon', 'authenticated', 'PUBLIC')), '[]'::jsonb),
  'column_grants', coalesce((select jsonb_agg(to_jsonb(g)) from information_schema.role_column_grants g where table_schema in ('public', 'private') and grantee in ('anon', 'authenticated', 'PUBLIC')), '[]'::jsonb)
)) as security_snapshot;
