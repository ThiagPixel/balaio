-- Execute no SQL Editor após 0027. Todas as linhas devem ter passed = true.
select 'tabelas com RLS forçada' as check_name,
  count(*) = 5 as passed
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('service_orders','service_order_steps','service_order_step_dependencies',
   'service_order_blockers','service_order_events')
  and c.relrowsecurity and c.relforcerowsecurity
union all
select 'sem leitura direta para authenticated',
  not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in
      ('service_orders','service_order_steps','service_order_step_dependencies',
       'service_order_blockers','service_order_events')
      and has_table_privilege('authenticated', c.oid, 'SELECT'))
union all
select 'RPCs principais instaladas',
  to_regprocedure('public.create_service_order(text,text,text,text,date,uuid,jsonb)') is not null
  and to_regprocedure('public.list_service_orders(text,integer)') is not null
  and to_regprocedure('public.get_service_order(uuid)') is not null
  and to_regprocedure('public.complete_service_order(uuid)') is not null
union all
select 'anônimo sem acesso às RPCs',
  not has_function_privilege('anon', 'public.list_service_orders(text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.complete_service_order(uuid)', 'EXECUTE')
union all
select 'permissões de OS cadastradas',
  count(*) = 6 from public.permissions
  where key in ('os.view','os.create','os.manage','os.execute','os.resolve','os.complete')
union all
select 'consultas de prioridade 0028 instaladas',
  position('waiting_kind' in pg_get_functiondef(to_regprocedure('public.get_service_order_dashboard()'))) > 0
  and position('sort_rank' in pg_get_functiondef(to_regprocedure('public.list_service_orders(text,integer)'))) > 0;
