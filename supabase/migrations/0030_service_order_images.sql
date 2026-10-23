-- Uma foto opcional por OS. O arquivo fica no Storage; o banco guarda apenas o caminho.
begin;
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('public.get_service_order(uuid)') is null then
    raise exception 'A migration 0027 precisa estar aplicada.';
  end if;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('service-order-images', 'service-order-images', false, 1048576,
  array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.service_order_images (
  order_id uuid primary key,
  tenant_id uuid not null,
  object_path text not null unique,
  uploaded_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, order_id) references public.service_orders(tenant_id, id) on delete cascade,
  foreign key (tenant_id, uploaded_by) references public.users(tenant_id, id)
);
create index service_order_images_tenant_idx on public.service_order_images(tenant_id, order_id);
alter table public.service_order_images enable row level security;
alter table public.service_order_images force row level security;
revoke all on public.service_order_images from public, anon, authenticated;

-- Os caminhos são validados por uma função interna, pois as tabelas de OS não
-- concedem SELECT direto a authenticated.
create function private.can_access_service_order_image(p_path text, p_action text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_order uuid; v_filename text;
begin
  v_tenant := private.current_tenant_id();
  if v_tenant is null or p_path is null
    or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    or split_part(p_path, '/', 1) <> v_tenant::text then return false; end if;
  v_order := split_part(p_path, '/', 2)::uuid;
  v_filename := split_part(p_path, '/', 3);
  if v_filename is null then return false; end if;
  if p_action = 'read' then
    return private.has_permission('os.view') and exists(
      select 1 from public.service_orders o where o.id = v_order and o.tenant_id = v_tenant);
  end if;
  if p_action in ('insert', 'delete') then
    return private.has_permission('os.create') and private.has_permission('os.view')
      and exists(select 1 from public.service_orders o where o.id = v_order
        and o.tenant_id = v_tenant and o.created_by = auth.uid())
      and (p_action = 'insert' or not exists(
        select 1 from public.service_order_images i where i.object_path = p_path));
  end if;
  return false;
exception when invalid_text_representation then return false;
end; $$;
revoke all on function private.can_access_service_order_image(text,text) from public, anon, authenticated;
grant execute on function private.can_access_service_order_image(text,text) to authenticated;

-- O caminho identifica empresa, OS e arquivo; não confia no nome enviado pelo navegador.
create function public.attach_service_order_image(p_order_id uuid, p_object_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.create');
  perform private.require_permission('os.view');
  if p_object_path is null or p_object_path !~
    ('^' || v_tenant::text || '/' || p_order_id::text || '/[0-9a-f-]{36}\.(webp|jpg)$') then
    raise exception using errcode = '22023', message = 'Caminho da foto inválido.';
  end if;
  if not exists(select 1 from public.service_orders o
    where o.id = p_order_id and o.tenant_id = v_tenant and o.created_by = auth.uid()) then
    raise exception using errcode = 'P0002', message = 'OS não encontrada para este usuário.';
  end if;
  if not exists(select 1 from storage.objects s
    where s.bucket_id = 'service-order-images' and s.name = p_object_path) then
    raise exception using errcode = 'P0002', message = 'Foto enviada não encontrada.';
  end if;
  insert into public.service_order_images(tenant_id, order_id, object_path, uploaded_by)
  values(v_tenant, p_order_id, p_object_path, auth.uid());
end; $$;

create function public.get_service_order_image(p_order_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select image.object_path from public.service_order_images image
    where image.tenant_id = v_tenant and image.order_id = p_order_id);
end; $$;

drop policy if exists service_order_images_read on storage.objects;
create policy service_order_images_read on storage.objects for select to authenticated
using (bucket_id = 'service-order-images'
  and private.can_access_service_order_image(name, 'read'));

drop policy if exists service_order_images_insert on storage.objects;
create policy service_order_images_insert on storage.objects for insert to authenticated
with check (bucket_id = 'service-order-images'
  and private.can_access_service_order_image(name, 'insert'));

-- Permite limpar apenas uploads ainda não vinculados, nunca uma foto exibida na OS.
drop policy if exists service_order_images_delete_orphan on storage.objects;
create policy service_order_images_delete_orphan on storage.objects for delete to authenticated
using (bucket_id = 'service-order-images'
  and private.can_access_service_order_image(name, 'delete'));

revoke all on function public.attach_service_order_image(uuid,text),
  public.get_service_order_image(uuid) from public, anon, authenticated;
grant execute on function public.attach_service_order_image(uuid,text),
  public.get_service_order_image(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
