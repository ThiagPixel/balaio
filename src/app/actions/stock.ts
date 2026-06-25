"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/supabase/tenant";

const movementSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Quantidade não pode ser zero"),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type StockState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createMovement(
  _prev: StockState,
  formData: FormData
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

  const { supabase } = await requireTenant();
  const data = parsed.data;

  // Insere movimentação
  const { error: mvError } = await supabase
    .from("stock_movements")
    .insert({
      product_id: data.product_id,
      type: data.type,
      quantity: data.quantity,
      unit_cost: data.unit_cost,
      notes: data.notes,
    });

  if (mvError) return { error: mvError.message };

  // Atualiza o estoque atual do produto
  // - IN: soma
  // - OUT: subtrai
  // - ADJUST: define como a quantidade
  const { data: product, error: prodError } = await supabase
    .from("products")
    .select("current_stock")
    .eq("id", data.product_id)
    .single();

  if (prodError || !product) {
    return { error: "Produto não encontrado" };
  }

  let newStock = product.current_stock;
  if (data.type === "IN") newStock += data.quantity;
  else if (data.type === "OUT") newStock -= data.quantity;
  else if (data.type === "ADJUST") newStock = data.quantity;

  if (newStock < 0) {
    return { error: "Estoque ficaria negativo" };
  }

  const { error: updError } = await supabase
    .from("products")
    .update({ current_stock: newStock })
    .eq("id", data.product_id);

  if (updError) return { error: updError.message };

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/stock");
}
