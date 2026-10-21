-- OS inicial: abertura restrita, etapas atribuídas, pendências e conclusão pelo principal.
-- Aplicar somente após testar esta migration em ambiente isolado.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('private.require_permission(text)') is null then
    raise exception 'A migration 0023 precisa estar aplicada.';
  end if;
end $$;

insert into public.permissions(key, module, name, description, sort_order, assignable_to_member) values
  ('os.view', 'os', 'Ver ordens de serviço', 'Consultar OS da empresa.', 10, true),
  ('os.create', 'os', 'Abrir ordens de serviço', 'Abrir OS e atribuir etapas.', 20, true),
  ('os.manage', 'os', 'Administrar ordens de serviço', 'Iniciar OS e registrar pendências.', 30, true),
  ('os.execute', 'os', 'Executar etapas de OS', 'Concluir etapas atribuídas.', 40, true),
  ('os.resolve', 'os', 'Resolver pendências de OS', 'Confirmar atendimento de pendências.', 50, true),
  ('os.complete', 'os', 'Concluir ordens de serviço', 'Concluir OS como responsável principal.', 60, true)
on conflict (key) do nothing;

create unique index if not exists users_tenant_id_id_unique on public.users(tenant_id, id);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number bigint generated always as identity,
  title text not null check(length(btrim(title)) between 3 and 160),
  description text check(length(description) <= 2000),
  location_label text check(length(location_label) <= 160),
  priority text not null default 'NORMAL' check(priority in ('LOW','NORMAL','HIGH')),
  status text not null default 'OPEN' check(status in ('OPEN','IN_PROGRESS','WAITING','COMPLETED')),
  principal_id uuid not null,
  created_by uuid not null,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, id),
  foreign key(tenant_id, principal_id) references public.users(tenant_id, id),
  foreign key(tenant_id, created_by) references public.users(tenant_id, id),
  check((status = 'COMPLETED') = (completed_at is not null))
);
create index service_orders_tenant_status_idx on public.service_orders(tenant_id, status, created_at desc);
create index service_orders_tenant_principal_idx on public.service_orders(tenant_id, principal_id, due_date);

create table public.service_order_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  position integer not null check(position > 0),
  title text not null check(length(btrim(title)) between 3 and 160),
  assignee_id uuid not null,
  completed_at timestamptz,
  completed_by uuid,
  completion_note text check(length(completion_note) <= 1000),
  unique(tenant_id, id), unique(order_id, position),
  foreign key(tenant_id, order_id) references public.service_orders(tenant_id, id),
  foreign key(tenant_id, assignee_id) references public.users(tenant_id, id),
  foreign key(tenant_id, completed_by) references public.users(tenant_id, id),
  check((completed_at is null) = (completed_by is null))
);
create index service_order_steps_order_idx on public.service_order_steps(tenant_id, order_id, position);

create table public.service_order_step_dependencies (
  tenant_id uuid not null,
  order_id uuid not null,
  step_id uuid not null,
  prerequisite_step_id uuid not null,
  primary key(step_id, prerequisite_step_id),
  foreign key(tenant_id, order_id) references public.service_orders(tenant_id, id),
  foreign key(tenant_id, step_id) references public.service_order_steps(tenant_id, id),
  foreign key(tenant_id, prerequisite_step_id) references public.service_order_steps(tenant_id, id),
  check(step_id <> prerequisite_step_id)
);
create index service_order_step_dependencies_order_idx on public.service_order_step_dependencies(tenant_id, order_id);

create table public.service_order_blockers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  kind text not null check(kind in ('MATERIAL','EXTERNAL','OTHER')),
  description text not null check(length(btrim(description)) between 3 and 500),
  responsible_name text check(length(responsible_name) <= 120),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text check(length(resolution_note) <= 1000),
  foreign key(tenant_id, order_id) references public.service_orders(tenant_id, id),
  foreign key(tenant_id, created_by) references public.users(tenant_id, id),
  foreign key(tenant_id, resolved_by) references public.users(tenant_id, id),
  check((resolved_at is null) = (resolved_by is null))
);
create index service_order_blockers_open_idx on public.service_order_blockers(tenant_id, order_id) where resolved_at is null;

create table public.service_order_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  order_id uuid not null,
  actor_id uuid not null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key(tenant_id, order_id) references public.service_orders(tenant_id, id),
  foreign key(tenant_id, actor_id) references public.users(tenant_id, id)
);
create index service_order_events_order_idx on public.service_order_events(tenant_id, order_id, created_at, id);

alter table public.service_orders enable row level security;
alter table public.service_orders force row level security;
alter table public.service_order_steps enable row level security;
alter table public.service_order_steps force row level security;
alter table public.service_order_step_dependencies enable row level security;
alter table public.service_order_step_dependencies force row level security;
alter table public.service_order_blockers enable row level security;
alter table public.service_order_blockers force row level security;
alter table public.service_order_events enable row level security;
alter table public.service_order_events force row level security;
revoke all on public.service_orders, public.service_order_steps, public.service_order_step_dependencies, public.service_order_blockers,
  public.service_order_events from public, anon, authenticated;

create function public.create_service_order(p_title text, p_description text, p_location_label text,
  p_priority text, p_due_date date, p_principal_id uuid, p_steps jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_id uuid; v_step jsonb; v_assignee uuid; v_position integer := 0;
  v_step_id uuid; v_previous_id uuid;
begin
  v_tenant := private.require_permission('os.create');
  perform private.require_permission('os.view');
  if p_due_date is null or not isfinite(p_due_date)
    or p_due_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '22023', message = 'Selecione um prazo válido a partir de hoje.';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 3 and 160
    or length(coalesce(p_description, '')) > 2000 or length(coalesce(p_location_label, '')) > 160
    or p_priority is null or p_priority not in ('LOW','NORMAL','HIGH')
    or p_steps is null or jsonb_typeof(p_steps) <> 'array'
    or jsonb_array_length(p_steps) not between 1 and 20 then
    raise exception using errcode = '22023', message = 'Dados da OS inválidos.';
  end if;
  if not exists(select 1 from public.users where id = p_principal_id and tenant_id = v_tenant and active) then
    raise exception using errcode = '22023', message = 'Responsável principal inválido.';
  end if;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    if jsonb_typeof(v_step) <> 'object' or length(btrim(coalesce(v_step->>'title',''))) not between 3 and 160
      or coalesce(v_step->>'assignee_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'Etapa inválida.';
    end if;
    v_assignee := (v_step->>'assignee_id')::uuid;
    if not exists(select 1 from public.users where id = v_assignee and tenant_id = v_tenant and active) then
      raise exception using errcode = '22023', message = 'Técnico de etapa inválido.';
    end if;
  end loop;
  insert into public.service_orders(tenant_id,title,description,location_label,priority,principal_id,created_by,due_date)
  values(v_tenant,btrim(p_title),nullif(btrim(p_description),''),nullif(btrim(p_location_label),''),
    p_priority,p_principal_id,auth.uid(),p_due_date) returning id into v_id;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    v_position := v_position + 1;
    insert into public.service_order_steps(tenant_id,order_id,position,title,assignee_id)
    values(v_tenant,v_id,v_position,btrim(v_step->>'title'),(v_step->>'assignee_id')::uuid)
    returning id into v_step_id;
    if v_step->>'depends_on_previous' = 'true' then
      if v_previous_id is null then raise exception using errcode = '22023', message = 'A primeira etapa não pode ter dependência.'; end if;
      insert into public.service_order_step_dependencies(tenant_id,order_id,step_id,prerequisite_step_id)
      values(v_tenant,v_id,v_step_id,v_previous_id);
    end if;
    v_previous_id := v_step_id;
  end loop;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type)
  values(v_tenant,v_id,auth.uid(),'CREATED');
  return v_id;
end; $$;

create function public.list_service_order_people()
returns table(id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.create');
  perform private.require_permission('os.view');
  return query select u.id,u.full_name,u.email from public.users u
    where u.tenant_id = v_tenant and u.active order by coalesce(u.full_name,u.email);
end; $$;

create function public.list_service_orders(p_status text default null, p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  if p_status is not null and p_status not in ('OPEN','IN_PROGRESS','WAITING','COMPLETED') then
    raise exception using errcode = '22023', message = 'Estado inválido.';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select o.id,o.number,o.title,o.location_label,o.priority,o.status,o.due_date,o.created_at,
      coalesce(u.full_name,u.email) as principal_name,
      (select b.description from public.service_order_blockers b
        where b.tenant_id = v_tenant and b.order_id = o.id and b.resolved_at is null
        order by b.created_at limit 1) as waiting_for
    from public.service_orders o join public.users u on u.id = o.principal_id and u.tenant_id = o.tenant_id
    where o.tenant_id = v_tenant and (p_status is null or o.status = p_status)
    order by o.created_at desc limit least(greatest(coalesce(p_limit,100),1),200)
  ) x), '[]'::jsonb);
end; $$;

create function public.get_service_order(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select to_jsonb(o) || jsonb_build_object(
    'principal_name',coalesce(u.full_name,u.email),
    'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from (
      select st.id,st.position,st.title,st.assignee_id,coalesce(assignee.full_name,assignee.email) as assignee_name,
        st.completed_at,st.completion_note,
        (select prerequisite.title from public.service_order_step_dependencies d
          join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
            and prerequisite.tenant_id = d.tenant_id
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id
          limit 1) as depends_on_title,
        (select prerequisite.completed_at is not null from public.service_order_step_dependencies d
          join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id
            and prerequisite.tenant_id = d.tenant_id
          where d.tenant_id = v_tenant and d.order_id = o.id and d.step_id = st.id
          limit 1) as depends_on_completed
      from public.service_order_steps st
      join public.users assignee on assignee.id = st.assignee_id and assignee.tenant_id = st.tenant_id
      where st.tenant_id = v_tenant and st.order_id = o.id
    ) s),'[]'::jsonb),
    'blockers',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at) from (
      select id,kind,description,responsible_name,created_at,resolved_at,resolution_note
      from public.service_order_blockers where tenant_id = v_tenant and order_id = o.id
    ) b),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from (
      select id,event_type,detail,created_at from public.service_order_events
      where tenant_id = v_tenant and order_id = o.id order by created_at desc,id desc limit 50
    ) e),'[]'::jsonb)
  ) from public.service_orders o join public.users u on u.id = o.principal_id and u.tenant_id = o.tenant_id
  where o.id = p_order_id and o.tenant_id = v_tenant);
end; $$;

create function public.start_service_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_status text;
begin
  v_tenant := private.require_permission('os.manage');
  select status into v_status from public.service_orders where id = p_order_id and tenant_id = v_tenant for update;
  if v_status is null then raise exception using errcode = 'P0002', message = 'OS não encontrada.'; end if;
  if v_status <> 'OPEN' then raise exception using errcode = '22023', message = 'OS não está aberta.'; end if;
  update public.service_orders set status = 'IN_PROGRESS', started_at = now(), updated_at = now()
  where id = p_order_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type)
  values(v_tenant,p_order_id,auth.uid(),'STARTED');
end; $$;

create function public.add_service_order_blocker(p_order_id uuid, p_kind text, p_description text,
  p_responsible_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_status text; v_id uuid;
begin
  v_tenant := private.require_permission('os.manage');
  if p_kind is null or p_kind not in ('MATERIAL','EXTERNAL','OTHER')
    or length(btrim(coalesce(p_description,''))) not between 3 and 500
    or length(coalesce(p_responsible_name,'')) > 120 then
    raise exception using errcode = '22023', message = 'Pendência inválida.';
  end if;
  select status into v_status from public.service_orders where id = p_order_id and tenant_id = v_tenant for update;
  if v_status is null then raise exception using errcode = 'P0002', message = 'OS não encontrada.'; end if;
  if v_status = 'COMPLETED' then raise exception using errcode = '22023', message = 'OS concluída.'; end if;
  insert into public.service_order_blockers(tenant_id,order_id,kind,description,responsible_name,created_by)
  values(v_tenant,p_order_id,p_kind,btrim(p_description),nullif(btrim(p_responsible_name),''),auth.uid())
  returning id into v_id;
  update public.service_orders set status = 'WAITING', updated_at = now() where id = p_order_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,p_order_id,auth.uid(),'BLOCKED',jsonb_build_object('blocker_id',v_id,'description',p_description));
  return v_id;
end; $$;

create function public.resolve_service_order_blocker(p_blocker_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_order uuid; v_status text;
begin
  v_tenant := private.require_permission('os.resolve');
  if length(coalesce(p_note,'')) > 1000 then raise exception using errcode = '22023', message = 'Observação muito longa.'; end if;
  select order_id into v_order from public.service_order_blockers
    where id = p_blocker_id and tenant_id = v_tenant and resolved_at is null;
  if v_order is null then raise exception using errcode = 'P0002', message = 'Pendência aberta não encontrada.'; end if;
  select status into v_status from public.service_orders where id = v_order and tenant_id = v_tenant for update;
  update public.service_order_blockers set resolved_at = now(), resolved_by = auth.uid(),
    resolution_note = nullif(btrim(p_note),'')
    where id = p_blocker_id and tenant_id = v_tenant and resolved_at is null;
  if not found then raise exception using errcode = 'P0002', message = 'Pendência já resolvida.'; end if;
  if not exists(select 1 from public.service_order_blockers where tenant_id = v_tenant and order_id = v_order and resolved_at is null) then
    update public.service_orders set status = case when started_at is null then 'OPEN' else 'IN_PROGRESS' end,
      updated_at = now() where id = v_order and tenant_id = v_tenant;
  end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_order,auth.uid(),'UNBLOCKED',jsonb_build_object('blocker_id',p_blocker_id,'note',p_note));
end; $$;

create function public.complete_service_order_step(p_step_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_order uuid; v_assignee uuid; v_done timestamptz; v_status text;
begin
  v_tenant := private.require_permission('os.execute');
  if length(coalesce(p_note,'')) > 1000 then raise exception using errcode = '22023', message = 'Observação muito longa.'; end if;
  select order_id,assignee_id,completed_at into v_order,v_assignee,v_done from public.service_order_steps
    where id = p_step_id and tenant_id = v_tenant;
  if v_order is null then raise exception using errcode = 'P0002', message = 'Etapa não encontrada.'; end if;
  select status into v_status from public.service_orders where id = v_order and tenant_id = v_tenant for update;
  if v_assignee <> auth.uid() then raise exception using errcode = '42501', message = 'Etapa atribuída a outro profissional.'; end if;
  if v_status not in ('IN_PROGRESS','WAITING') or v_done is not null then
    raise exception using errcode = '22023', message = 'Etapa indisponível para conclusão.';
  end if;
  if exists(select 1 from public.service_order_step_dependencies d
    join public.service_order_steps prerequisite on prerequisite.id = d.prerequisite_step_id and prerequisite.tenant_id = d.tenant_id
    where d.tenant_id = v_tenant and d.order_id = v_order and d.step_id = p_step_id
      and prerequisite.completed_at is null) then
    raise exception using errcode = '22023', message = 'Conclua a etapa anterior primeiro.';
  end if;
  update public.service_order_steps set completed_at = now(),completed_by = auth.uid(),
    completion_note = nullif(btrim(p_note),'') where id = p_step_id and tenant_id = v_tenant and completed_at is null;
  if not found then raise exception using errcode = '22023', message = 'Etapa já concluída.'; end if;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
  values(v_tenant,v_order,auth.uid(),'STEP_COMPLETED',jsonb_build_object('step_id',p_step_id,'note',p_note));
end; $$;

create function public.complete_service_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_status text; v_principal uuid;
begin
  v_tenant := private.require_permission('os.complete');
  select status,principal_id into v_status,v_principal from public.service_orders
    where id = p_order_id and tenant_id = v_tenant for update;
  if v_status is null then raise exception using errcode = 'P0002', message = 'OS não encontrada.'; end if;
  if v_principal <> auth.uid() then raise exception using errcode = '42501', message = 'Somente o responsável principal conclui a OS.'; end if;
  if v_status <> 'IN_PROGRESS' then raise exception using errcode = '22023', message = 'OS não está pronta para conclusão.'; end if;
  if exists(select 1 from public.service_order_steps where tenant_id = v_tenant and order_id = p_order_id and completed_at is null)
    or exists(select 1 from public.service_order_blockers where tenant_id = v_tenant and order_id = p_order_id and resolved_at is null) then
    raise exception using errcode = '22023', message = 'Existem etapas ou pendências abertas.';
  end if;
  update public.service_orders set status = 'COMPLETED',completed_at = now(),updated_at = now()
    where id = p_order_id and tenant_id = v_tenant;
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type)
  values(v_tenant,p_order_id,auth.uid(),'COMPLETED');
end; $$;

create function public.get_service_order_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select jsonb_build_object(
    'open',count(*) filter(where status = 'OPEN'),
    'in_progress',count(*) filter(where status = 'IN_PROGRESS'),
    'waiting',count(*) filter(where status = 'WAITING'),
    'completed',count(*) filter(where status = 'COMPLETED'),
    'urgent',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select number,title,location_label,status,due_date from public.service_orders
      where tenant_id = v_tenant and status <> 'COMPLETED'
      order by due_date nulls last, created_at limit 3
    ) x),'[]'::jsonb)
  ) from public.service_orders where tenant_id = v_tenant);
end; $$;

revoke all on function public.create_service_order(text,text,text,text,date,uuid,jsonb),
  public.list_service_order_people(), public.list_service_orders(text,integer), public.get_service_order(uuid),
  public.start_service_order(uuid), public.add_service_order_blocker(uuid,text,text,text),
  public.resolve_service_order_blocker(uuid,text), public.complete_service_order_step(uuid,text),
  public.complete_service_order(uuid), public.get_service_order_dashboard()
  from public, anon, authenticated;
grant execute on function public.create_service_order(text,text,text,text,date,uuid,jsonb),
  public.list_service_order_people(), public.list_service_orders(text,integer), public.get_service_order(uuid),
  public.start_service_order(uuid), public.add_service_order_blocker(uuid,text,text,text),
  public.resolve_service_order_blocker(uuid,text), public.complete_service_order_step(uuid,text),
  public.complete_service_order(uuid), public.get_service_order_dashboard()
  to authenticated;

notify pgrst, 'reload schema';
commit;
