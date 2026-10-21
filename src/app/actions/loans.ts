"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import { isPermissionDeniedError, requirePermission } from "@/lib/supabase/access";

export type LoanFormState = { error?: string; success?: string } | null;

const itemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  identifier: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  item_id: z.union([z.string().uuid(), z.literal("")]),
  active: z.boolean(),
});
const checkoutSchema = z.object({
  item_id: z.string().uuid(),
  borrower_name: z.string().trim().min(2).max(120),
  borrower_affiliation: z.string().trim().max(120),
  notes: z.string().trim().max(1000),
});
const returnSchema = z.object({ loan_id: z.string().uuid(), notes: z.string().trim().max(1000) });

function dbError(error: { code?: string; message: string }, fallback: string) {
  return ["22023", "23505", "P0002", "42501"].includes(error.code ?? "")
    ? error.message : fallback;
}

export async function saveLoanItem(_previous: LoanFormState, form: FormData): Promise<LoanFormState> {
  const parsed = itemSchema.safeParse({
    name: form.get("name"), identifier: form.get("identifier"),
    description: form.get("description") ?? "", item_id: form.get("item_id") ?? "",
    active: form.get("active") === "on",
  });
  if (!parsed.success) return { error: "Confira o nome, a identificação e a descrição do exemplar." };
  try {
    const { supabase } = await requirePermission(PERMISSIONS.LOANS_MANAGE);
    const { error } = await supabase.rpc("save_loan_item", {
      p_name: parsed.data.name, p_identifier: parsed.data.identifier,
      p_description: parsed.data.description || null,
      p_item_id: parsed.data.item_id || null, p_active: parsed.data.active,
    });
    if (error) return { error: dbError(error, "Não foi possível salvar o exemplar.") };
    revalidatePath("/loans");
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
  redirect("/loans?tab=available");
}

export async function startLoan(_previous: LoanFormState, form: FormData): Promise<LoanFormState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "Confira o exemplar e o nome de quem recebe." };
  try {
    const { supabase } = await requirePermission(PERMISSIONS.LOANS_LEND);
    const { error } = await supabase.rpc("start_item_loan", {
      p_item_id: parsed.data.item_id, p_borrower_name: parsed.data.borrower_name,
      p_borrower_affiliation: parsed.data.borrower_affiliation || null,
      p_due_date: null, p_notes: parsed.data.notes || null,
    });
    if (error) return { error: dbError(error, "Não foi possível registrar o empréstimo.") };
    revalidatePath("/loans");
    revalidatePath("/");
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
  redirect("/loans");
}

export async function finishLoan(_previous: LoanFormState, form: FormData): Promise<LoanFormState> {
  const parsed = returnSchema.safeParse({ loan_id: form.get("loan_id"), notes: form.get("notes") ?? "" });
  if (!parsed.success) return { error: "Confira o registro e a observação da devolução." };
  try {
    const { supabase } = await requirePermission(PERMISSIONS.LOANS_RETURN);
    const { error } = await supabase.rpc("finish_item_loan", {
      p_loan_id: parsed.data.loan_id, p_return_notes: parsed.data.notes || null,
    });
    if (error) return { error: dbError(error, "Não foi possível registrar a devolução.") };
    revalidatePath("/loans");
    revalidatePath("/");
    return { success: "Devolução registrada. O exemplar está disponível novamente." };
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
}
