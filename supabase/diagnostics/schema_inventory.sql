-- Inventário somente de leitura para o SQL Editor do Supabase.
-- Não consulta registros das tabelas da aplicação nem altera objetos.

-- Assinaturas, implementações e configuração das funções.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  p.proacl as explicit_privileges,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prokind = 'f'
order by n.nspname, p.proname, identity_arguments;

-- Inclui os triggers de cadastro em auth.users.
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, t.tgenabled as enabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('public', 'private', 'auth')
order by n.nspname, c.relname, t.tgname;

-- Estado de RLS e políticas, inclusive do Storage.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private', 'storage')
  and c.relkind in ('r', 'p')
order by n.nspname, c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'private', 'storage')
order by schemaname, tablename, policyname;

-- Privilégios efetivos, incluindo grants herdados de PUBLIC.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       r.rolname as role_name,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname in ('public', 'private')
  and p.prokind = 'f'
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by n.nspname, p.proname, identity_arguments, r.rolname;
