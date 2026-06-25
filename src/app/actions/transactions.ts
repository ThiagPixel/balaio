"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/supabase/tenant";

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Categoria obrigatória"),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data de vencimento obrigatória"),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
  paid_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type TransactionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createTransaction(
  _prev: TransactionState,
  formData: FormData
): Promise<TransactionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = transactionSchema.safeParse({
    ...raw,
    paid_at: raw.paid_at || null,
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

  // Se status = PAID e não tem paid_at, define como hoje
  if (data.status === "PAID" && !data.paid_at) {
    data.paid_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("transactions").insert(data);
  if (error) return { error: error.message };

  revalidatePath("/financial");
  revalidatePath("/");
  redirect("/financial");
}

export async function updateTransactionStatus(
  id: string,
  status: "PENDING" | "PAID" | "CANCELLED"
) {
  const { supabase } = await requireTenant();
  const updates: Record<string, unknown> = { status };
  if (status === "PAID") {
    updates.paid_at = new Date().toISOString().slice(0, 10);
  } else if (status === "PENDING") {
    updates.paid_at = null;
  }
  await supabase.from("transactions").update(updates).eq("id", id);
  revalidatePath("/financial");
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const { supabase } = await requireTenant();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/financial");
  revalidatePath("/");
}
