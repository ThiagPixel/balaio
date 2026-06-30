"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/supabase/tenant";

const movementSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, "Quantidade não pode ser zero"),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type StockState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createMovement(
  _prev: StockState,
  formData: FormData,
): Promise<StockState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = movementSchema.safeParse({
    ...raw,
    unit_cost: raw.unit_cost || null,
    notes: raw.notes || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => {
      if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const { supabase, tenantId } = await requireTenant();
  const data = parsed.data;

  // Busca produto verificando que pertence ao tenant do usuário
  const { data: product, error: prodError } = await supabase
    .from("products")
    .select("id, current_stock")
    .eq("id", data.product_id)
    .eq("tenant_id", tenantId)
    .single();

  if (prodError || !product) {
    return { error: "Produto não encontrado neste tenant" };
  }

  // Calcula novo estoque
  let newStock = product.current_stock;
  if (data.type === "IN") newStock += data.quantity;
  else if (data.type === "OUT") newStock -= data.quantity;
  else if (data.type === "ADJUST") newStock = data.quantity;

  if (newStock < 0) {
    return { error: "Estoque ficaria negativo" };
  }

  // Atualiza produto E insere movimentação de forma atômica
  // Usa transação para evitar race condition
  const { error: txError } = await supabase.rpc("execute_stock_movement", {
    p_product_id: data.product_id,
    p_tenant_id: tenantId,
    p_type: data.type,
    p_quantity: data.quantity,
    p_unit_cost: data.unit_cost,
    p_notes: data.notes,
    p_new_stock: newStock,
  });

  if (txError) return { error: txError.message };

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/stock");
}
