-- =====================================================
-- StockFlow - Triggers de auth
-- =====================================================
-- 1) Quando um user é criado em auth.users, cria um
--    registro em public.users vinculado ao tenant
--    (criado pelo app no signup via service_role)
-- 2) Custom Access Token Hook injeta tenant_id no JWT
-- =====================================================

-- -----------------------------------------------------
-- Trigger: criar public.users ao criar auth.users
-- -----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := (new.raw_user_meta_data ->> 'tenant_id')::uuid;

  -- Se não houver tenant_id no metadata, não cria (será feito
  -- explicitamente pelo app via service_role)
  if v_tenant_id is null then
    return new;
  end if;

  insert into public.users (id, tenant_id, email, full_name, role)
  values (
    new.id,
    v_tenant_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'owner')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------
-- Custom Access Token Hook: injeta tenant_id no JWT
-- -----------------------------------------------------
-- IMPORTANTE: além de criar a função, habilite o hook em
-- Authentication > Hooks (Supabase Dashboard) selecionando
-- "Customize Access Token (JWT) Claims" e apontando para
-- public.custom_access_token_hook.
-- -----------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_tenant_id uuid;
  v_full_name text;
begin
  select u.tenant_id, u.full_name
    into v_tenant_id, v_full_name
  from public.users u
  where u.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if v_tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id));
  end if;

  if v_full_name is not null then
    claims := jsonb_set(claims, '{full_name}', to_jsonb(v_full_name));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permissões necessárias
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Também permitir que usuários autenticados leiam seu próprio user
-- (necessário para o hook funcionar via JWT)
grant select on public.users to supabase_auth_admin;
