-- Empréstimos permanecem pendentes até a devolução, sem prazo obrigatório.
begin;
set local lock_timeout = '5s';

alter table public.item_loans alter column due_date drop not null;

-- Mantém a assinatura para clientes antigos que ainda enviam p_due_date.
create or replace function public.start_item_loan(p_item_id uuid, p_borrower_name text, p_due_date date,
  p_borrower_affiliation text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_id uuid; v_active boolean; v_name text; v_identifier text;
begin
  v_tenant := private.require_permission('loans.lend');
  if length(btrim(coalesce(p_borrower_name, ''))) not between 2 and 120
    or length(coalesce(p_borrower_affiliation, '')) > 120
    or length(coalesce(p_notes, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Dados do empréstimo inválidos.';
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

create or replace function public.get_open_item_loan(p_loan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.view');
  return (select jsonb_build_object('id', l.id, 'item_name', i.name,
    'item_identifier', i.identifier, 'borrower_name', l.borrower_name,
    'due_date', l.due_date,
    'checked_out_at', l.checked_out_at)
    from public.item_loans l join public.loan_items i on i.id = l.item_id and i.tenant_id = l.tenant_id
    where l.id = p_loan_id and l.tenant_id = v_tenant and l.returned_at is null);
end; $$;

create or replace function public.get_item_loan_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('loans.view');
  return (select jsonb_build_object(
    'open', count(*),
    'overdue', 0,
    'due_today', 0,
    'urgent', coalesce((select jsonb_agg(to_jsonb(u) order by u.checked_out_at) from (
      select i.name as item_name, i.identifier as item_identifier, l.borrower_name,
        l.due_date, l.checked_out_at from public.item_loans l
      join public.loan_items i on i.id = l.item_id and i.tenant_id = l.tenant_id
      where l.tenant_id = v_tenant and l.returned_at is null
      order by l.checked_out_at limit 2
    ) u), '[]'::jsonb)
  ) from public.item_loans l where l.tenant_id = v_tenant and l.returned_at is null);
end; $$;

revoke all on function public.start_item_loan(uuid,text,date,text,text),
  public.get_open_item_loan(uuid), public.get_item_loan_dashboard() from public, anon, authenticated;
grant execute on function public.start_item_loan(uuid,text,date,text,text),
  public.get_open_item_loan(uuid), public.get_item_loan_dashboard() to authenticated;

notify pgrst, 'reload schema';
commit;
