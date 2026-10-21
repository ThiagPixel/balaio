-- Protocolo de exemplares devolvíveis. Aplicar após 0023 e 0024.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('private.require_permission(text)') is null then
    raise exception 'A migration 0023 precisa estar aplicada.';
  end if;
end $$;

insert into public.permissions (key, module, name, description, sort_order, assignable_to_member)
values
  ('loans.view', 'loans', 'Ver empréstimos', 'Consultar exemplares, empréstimos e devoluções.', 10, true),
  ('loans.manage', 'loans', 'Cadastrar exemplares', 'Cadastrar e alterar itens devolvíveis.', 20, true),
  ('loans.lend', 'loans', 'Registrar empréstimo', 'Autorizar e registrar o empréstimo de um exemplar.', 30, true),
  ('loans.return', 'loans', 'Registrar devolução', 'Confirmar a devolução de um exemplar.', 40, true)
on conflict (key) do nothing;

create table public.loan_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  identifier text not null check (length(btrim(identifier)) between 1 and 80),
  description text,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create unique index loan_items_tenant_identifier_unique
  on public.loan_items (tenant_id, lower(identifier));
create index loan_items_tenant_name_idx on public.loan_items (tenant_id, name);

create table public.item_loans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  item_id uuid not null,
  item_name_at_checkout text not null,
  item_identifier_at_checkout text not null,
  borrower_name text not null check (length(btrim(borrower_name)) between 2 and 120),
  borrower_affiliation text,
  due_date date not null,
  checkout_notes text,
  checked_out_by uuid references public.users(id) on delete set null,
  checked_out_at timestamptz not null default now(),
  returned_at timestamptz,
  returned_by uuid references public.users(id) on delete set null,
  return_notes text,
  constraint item_loans_item_tenant_fk foreign key (tenant_id, item_id)
    references public.loan_items(tenant_id, id),
  constraint item_loans_return_consistency check
    ((returned_at is null and returned_by is null and return_notes is null)
      or (returned_at is not null and returned_by is not null)),
  constraint item_loans_return_after_checkout check
    (returned_at is null or returned_at >= checked_out_at)
);
create unique index item_loans_one_open_per_item on public.item_loans(item_id)
  where returned_at is null;
create index item_loans_tenant_open_due_idx on public.item_loans(tenant_id, due_date)
  where returned_at is null;
create index item_loans_tenant_history_idx on public.item_loans(tenant_id, checked_out_at desc);

alter table public.loan_items enable row level security;
alter table public.loan_items force row level security;
alter table public.item_loans enable row level security;
alter table public.item_loans force row level security;
revoke all on public.loan_items, public.item_loans from public, anon, authenticated;

create function public.save_loan_item(p_name text, p_identifier text, p_description text default null, p_item_id uuid default null, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_id uuid;
begin
  v_tenant := private.require_permission('loans.manage');
  if length(btrim(coalesce(p_name, ''))) not between 2 and 120
    or length(btrim(coalesce(p_identifier, ''))) not between 1 and 80
    or length(coalesce(p_description, '')) > 500 or p_active is null then
    raise exception using errcode = '22023', message = 'Dados do exemplar inválidos.';
  end if;
  if p_item_id is null then
    insert into public.loan_items(tenant_id, name, identifier, description, created_by)
    values(v_tenant, btrim(p_name), btrim(p_identifier), nullif(btrim(p_description), ''), auth.uid())
    returning id into v_id;
  else
    update public.loan_items set name = btrim(p_name), identifier = btrim(p_identifier),
      description = nullif(btrim(p_description), ''), active = p_active, updated_at = now()
    where id = p_item_id and tenant_id = v_tenant returning id into v_id;
    if v_id is null then raise exception using errcode = 'P0002', message = 'Exemplar não encontrado nesta empresa.'; end if;
  end if;
  return v_id;
end; $$;

create function public.list_loan_items()
returns table(id uuid, name text, identifier text, description text, active boolean, available boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.view');
  return query select i.id, i.name, i.identifier, i.description, i.active,
    i.active and not exists(select 1 from public.item_loans l where l.item_id = i.id and l.returned_at is null)
    from public.loan_items i where i.tenant_id = v_tenant order by i.name, i.identifier;
end; $$;

create function public.start_item_loan(p_item_id uuid, p_borrower_name text, p_due_date date,
  p_borrower_affiliation text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_id uuid; v_active boolean; v_name text; v_identifier text;
begin
  v_tenant := private.require_permission('loans.lend');
  if length(btrim(coalesce(p_borrower_name, ''))) not between 2 and 120
    or length(coalesce(p_borrower_affiliation, '')) > 120
    or length(coalesce(p_notes, '')) > 1000
    or p_due_date is null or not isfinite(p_due_date)
    or p_due_date < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '22023', message = 'Dados do empréstimo ou prazo inválidos.';
  end if;
  select i.active, i.name, i.identifier into v_active, v_name, v_identifier from public.loan_items i
    where i.id = p_item_id and i.tenant_id = v_tenant for update;
  if not found then raise exception using errcode = 'P0002', message = 'Exemplar não encontrado nesta empresa.'; end if;
  if not v_active then raise exception using errcode = '22023', message = 'Exemplar inativo.'; end if;
  if exists(select 1 from public.item_loans l where l.item_id = p_item_id and l.returned_at is null) then
    raise exception using errcode = '23505', message = 'Este exemplar já está emprestado.';
  end if;
  insert into public.item_loans(tenant_id, item_id, item_name_at_checkout,
    item_identifier_at_checkout, borrower_name, borrower_affiliation,
    due_date, checkout_notes, checked_out_by)
  values(v_tenant, p_item_id, v_name, v_identifier, btrim(p_borrower_name), nullif(btrim(p_borrower_affiliation), ''),
    p_due_date, nullif(btrim(p_notes), ''), auth.uid()) returning id into v_id;
  return v_id;
end; $$;

create function public.finish_item_loan(p_loan_id uuid, p_return_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.return');
  if length(coalesce(p_return_notes, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Observação muito longa.';
  end if;
  update public.item_loans set returned_at = now(), returned_by = auth.uid(),
    return_notes = nullif(btrim(p_return_notes), '')
  where id = p_loan_id and tenant_id = v_tenant and returned_at is null;
  if not found then raise exception using errcode = 'P0002', message = 'Empréstimo aberto não encontrado nesta empresa.'; end if;
end; $$;

create function public.list_item_loans(p_status text default 'OPEN', p_limit integer default 100)
returns table(id uuid, item_id uuid, item_name text, item_identifier text, borrower_name text,
  borrower_affiliation text, due_date date, checkout_notes text, checked_out_at timestamptz,
  checked_out_by_name text, returned_at timestamptz, returned_by_name text, return_notes text)
language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.view');
  if p_status not in ('OPEN', 'RETURNED') or p_status is null then
    raise exception using errcode = '22023', message = 'Filtro inválido.';
  end if;
  return query select l.id, i.id, l.item_name_at_checkout, l.item_identifier_at_checkout, l.borrower_name,
    l.borrower_affiliation, l.due_date, l.checkout_notes, l.checked_out_at,
    coalesce(c.full_name, c.email), l.returned_at, coalesce(r.full_name, r.email), l.return_notes
  from public.item_loans l join public.loan_items i on i.id = l.item_id and i.tenant_id = l.tenant_id
  left join public.users c on c.id = l.checked_out_by and c.tenant_id = l.tenant_id
  left join public.users r on r.id = l.returned_by and r.tenant_id = l.tenant_id
  where l.tenant_id = v_tenant and ((p_status = 'OPEN' and l.returned_at is null)
    or (p_status = 'RETURNED' and l.returned_at is not null))
  order by case when p_status = 'OPEN' then l.due_date end asc,
    case when p_status = 'RETURNED' then l.returned_at end desc, l.checked_out_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end; $$;

create function public.get_open_item_loan(p_loan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.view');
  return (select jsonb_build_object('id', l.id, 'item_name', i.name,
    'item_identifier', i.identifier, 'borrower_name', l.borrower_name,
    'due_date', l.due_date)
    from public.item_loans l join public.loan_items i on i.id = l.item_id and i.tenant_id = l.tenant_id
    where l.id = p_loan_id and l.tenant_id = v_tenant and l.returned_at is null);
end; $$;

create function public.get_item_loan_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_today date;
begin
  v_tenant := private.require_permission('loans.view');
  v_today := (now() at time zone 'America/Sao_Paulo')::date;
  return (select jsonb_build_object(
    'open', count(*),
    'overdue', count(*) filter(where l.due_date < v_today),
    'due_today', count(*) filter(where l.due_date = v_today),
    'urgent', coalesce((select jsonb_agg(to_jsonb(u) order by u.due_date, u.checked_out_at) from (
      select i.name as item_name, i.identifier as item_identifier, l.borrower_name,
        l.due_date, l.checked_out_at from public.item_loans l
      join public.loan_items i on i.id = l.item_id and i.tenant_id = l.tenant_id
      where l.tenant_id = v_tenant and l.returned_at is null
      order by l.due_date, l.checked_out_at limit 2
    ) u), '[]'::jsonb)
  ) from public.item_loans l where l.tenant_id = v_tenant and l.returned_at is null);
end; $$;

revoke all on function public.save_loan_item(text,text,text,uuid,boolean),
  public.list_loan_items(), public.start_item_loan(uuid,text,date,text,text),
  public.finish_item_loan(uuid,text), public.list_item_loans(text,integer), public.get_open_item_loan(uuid),
  public.get_item_loan_dashboard() from public, anon, authenticated;
grant execute on function public.save_loan_item(text,text,text,uuid,boolean),
  public.list_loan_items(), public.start_item_loan(uuid,text,date,text,text),
  public.finish_item_loan(uuid,text), public.list_item_loans(text,integer), public.get_open_item_loan(uuid),
  public.get_item_loan_dashboard() to authenticated;

notify pgrst, 'reload schema';
commit;
