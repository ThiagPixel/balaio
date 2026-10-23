-- Troca/remoção controlada da foto; apenas metadados no Postgres.
begin;
set local lock_timeout = '5s';
do $$ begin
  if to_regprocedure('public.archive_service_order(uuid)') is null then
    raise exception 'A migration 0034 precisa estar aplicada.';
  end if;
end $$;

create or replace function private.can_access_service_order_image(p_path text, p_action text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_order uuid;
begin
  v_tenant := private.current_tenant_id();
  if v_tenant is null or p_path is null
    or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    or split_part(p_path, '/', 1) <> v_tenant::text then return false; end if;
  v_order := split_part(p_path, '/', 2)::uuid;
  if p_action = 'read' then
    return private.has_permission('os.view') and exists(select 1 from public.service_orders o
      where o.id = v_order and o.tenant_id = v_tenant
        and (o.archived_at is null or private.has_permission('os.manage')));
  end if;
  if p_action in ('insert','delete') then
    return private.has_permission('os.view')
      and exists(select 1 from public.service_orders o where o.id = v_order
        and o.tenant_id = v_tenant and o.archived_at is null and o.status <> 'COMPLETED'
        and (private.has_permission('os.manage') or
          (private.has_permission('os.create') and o.created_by = auth.uid())))
      and (p_action = 'insert' or not exists(select 1 from public.service_order_images i
        where i.object_path = p_path));
  end if;
  return false;
exception when invalid_text_representation then return false;
end; $$;

create function public.replace_service_order_image(p_order_id uuid, p_object_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_old text;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  if p_object_path is null or p_object_path !~
    ('^' || v_tenant::text || '/' || p_order_id::text || '/[0-9a-f-]{36}\.(webp|jpg)$') then
    raise exception using errcode = '22023', message = 'Caminho da foto inválido.';
  end if;
  perform 1 from public.service_orders where id = p_order_id and tenant_id = v_tenant
    and archived_at is null and status <> 'COMPLETED' for update;
  if not found then raise exception using errcode = 'P0002', message = 'OS ativa não encontrada.'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'service-order-images' and name = p_object_path) then
    raise exception using errcode = 'P0002', message = 'Foto enviada não encontrada.';
  end if;
  select object_path into v_old from public.service_order_images
    where tenant_id = v_tenant and order_id = p_order_id for update;
  insert into public.service_order_images(tenant_id,order_id,object_path,uploaded_by)
    values(v_tenant,p_order_id,p_object_path,auth.uid())
    on conflict(order_id) do update set object_path = excluded.object_path,
      uploaded_by = excluded.uploaded_by, created_at = now();
  insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
    values(v_tenant,p_order_id,auth.uid(),'IMAGE_REPLACED',jsonb_build_object('had_image',v_old is not null));
  return v_old;
end; $$;

create function public.remove_service_order_image(p_order_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_old text;
begin
  v_tenant := private.require_permission('os.manage');
  perform private.require_permission('os.view');
  perform 1 from public.service_orders where id = p_order_id and tenant_id = v_tenant
    and archived_at is null and status <> 'COMPLETED' for update;
  if not found then raise exception using errcode = 'P0002', message = 'OS ativa não encontrada.'; end if;
  delete from public.service_order_images where tenant_id = v_tenant and order_id = p_order_id
    returning object_path into v_old;
  if v_old is not null then
    insert into public.service_order_events(tenant_id,order_id,actor_id,event_type,detail)
      values(v_tenant,p_order_id,auth.uid(),'IMAGE_REMOVED','{}'::jsonb);
  end if;
  return v_old;
end; $$;

create or replace function public.get_service_order_image(p_order_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := private.require_permission('os.view');
  return (select image.object_path from public.service_order_images image
    join public.service_orders o on o.id = image.order_id and o.tenant_id = image.tenant_id
    where image.tenant_id = v_tenant and image.order_id = p_order_id
      and (o.archived_at is null or private.has_permission('os.manage')));
end; $$;

revoke all on function public.replace_service_order_image(uuid,text),
  public.remove_service_order_image(uuid) from public, anon, authenticated;
grant execute on function public.replace_service_order_image(uuid,text),
  public.remove_service_order_image(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
