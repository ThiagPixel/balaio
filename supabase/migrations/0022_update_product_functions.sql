-- =====================================================
-- Balaio - Atualiza funções RPC para suportar image_url
-- =====================================================

-- =====================================================
-- Atualiza create_product
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_product(
  p_name text,
  p_sku text,
  p_description text,
  p_image_url text,
  p_unit text,
  p_cost_price numeric,
  p_sale_price numeric,
  p_min_stock integer,
  p_current_stock integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_product_id uuid;
BEGIN
  SELECT u.tenant_id INTO v_tenant_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não encontrado';
  END IF;

  INSERT INTO public.products (
    tenant_id, name, sku, description, image_url, unit,
    cost_price, sale_price, min_stock, current_stock
  ) VALUES (
    v_tenant_id, p_name, p_sku, p_description, p_image_url, p_unit,
    p_cost_price, p_sale_price, p_min_stock, p_current_stock
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

-- =====================================================
-- Atualiza update_product
-- =====================================================
DROP FUNCTION IF EXISTS public.update_product(uuid, text, text, text, text, numeric, integer, numeric);

CREATE FUNCTION public.update_product(
  p_product_id uuid,
  p_name text,
  p_sku text,
  p_description text,
  p_image_url text,
  p_unit text,
  p_sale_price numeric,
  p_min_stock integer,
  p_cost_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT u.tenant_id INTO v_tenant_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não encontrado';
  END IF;

  UPDATE public.products p
  SET name = p_name, sku = p_sku, description = p_description,
      image_url = p_image_url, unit = p_unit, sale_price = p_sale_price,
      min_stock = p_min_stock, cost_price = COALESCE(p_cost_price, p.cost_price)
  WHERE p.id = p_product_id AND p.tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- =====================================================
-- Atualiza get_product
-- =====================================================
DROP FUNCTION IF EXISTS public.get_product(uuid);

CREATE FUNCTION public.get_product(p_product_id uuid)
RETURNS TABLE (
  id uuid, tenant_id uuid, name text, sku text, description text,
  image_url text, unit text, cost_price numeric, sale_price numeric,
  min_stock integer, current_stock integer, active boolean,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.tenant_id, p.name, p.sku, p.description, p.image_url,
         p.unit, p.cost_price, p.sale_price, p.min_stock, p.current_stock,
         p.active, p.created_at, p.updated_at
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid());
END;
$$;

-- =====================================================
-- Atualiza list_products
-- =====================================================
DROP FUNCTION IF EXISTS public.list_products(text);

CREATE FUNCTION public.list_products(p_query text)
RETURNS TABLE (
  id uuid, tenant_id uuid, name text, sku text, description text,
  image_url text, unit text, cost_price numeric, sale_price numeric,
  min_stock integer, current_stock integer, active boolean,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT u.tenant_id INTO v_tenant_id
  FROM public.users u
  WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT p.id, p.tenant_id, p.name, p.sku, p.description, p.image_url,
         p.unit, p.cost_price, p.sale_price, p.min_stock, p.current_stock,
         p.active, p.created_at, p.updated_at
  FROM public.products p
  WHERE p.tenant_id = v_tenant_id
    AND (p_query IS NULL OR p_query = '' OR p.name ILIKE '%' || p_query || '%' OR p.sku ILIKE '%' || p_query || '%')
  ORDER BY p.name;
END;
$$;
