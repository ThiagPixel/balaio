-- =====================================================
-- Balaio - Adiciona coluna image_url na tabela products
-- =====================================================

-- Adiciona coluna image_url para armazenar URL da imagem do produto
alter table public.products
add column if not exists image_url text;

-- Cria índice para consultas por imagem
create index if not exists idx_products_image_url on public.products(image_url);

-- =====================================================
-- Balaio - Cria bucket de storage para imagens
-- =====================================================

-- Cria bucket público para imagens de produtos
-- O bucket é público para que as imagens possam ser acessadas diretamente via URL
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- =====================================================
-- Políticas RLS para o bucket de imagens
-- =====================================================

-- Permite que qualquer usuário autenticado faça upload de imagens
drop policy if exists "Allow authenticated uploads to product-images" on storage.objects;
create policy "Allow authenticated uploads to product-images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
);

-- Permite que qualquer pessoa leia imagens (bucket público)
drop policy if exists "Allow public read of product-images" on storage.objects;
create policy "Allow public read of product-images"
on storage.objects
for select
to public
using (
  bucket_id = 'product-images'
);

-- Permite que o dono da imagem a delete
drop policy if exists "Allow owner delete of product-images" on storage.objects;
create policy "Allow owner delete of product-images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
