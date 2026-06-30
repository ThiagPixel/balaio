"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/supabase/tenant";

const productSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().default("un"),
  cost_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().int().min(0).default(0),
  current_stock: z.coerce.number().int().min(0).default(0),
});

export type ProductState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createProduct(
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.safeParse({
    ...raw,
    sku: raw.sku || null,
    description: raw.description || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => {
      if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const { supabase, tenantId } = await requireTenant();

  const { error } = await supabase.from("products").insert({
    ...parsed.data,
    tenant_id: tenantId,
    active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um produto com este SKU" };
    }
    return { error: error.message };
  }

  revalidatePath("/products");
  revalidatePath("/");
  redirect("/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.safeParse({
    ...raw,
    sku: raw.sku || null,
    description: raw.description || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => {
      if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const { supabase, tenantId } = await requireTenant();
  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um produto com este SKU" };
    }
    return { error: error.message };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect("/products");
}

export async function toggleProductActive(id: string, active: boolean) {
  const { supabase, tenantId } = await requireTenant();
  await supabase
    .from("products")
    .update({ active })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  revalidatePath("/products");
}

export async function deleteProduct(id: string) {
  const { supabase, tenantId } = await requireTenant();
  await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  revalidatePath("/products");
}
