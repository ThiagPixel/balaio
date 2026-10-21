import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import type { LoanItem } from "@/lib/loans";
import { ItemForm } from "../../../loan-forms";

export const dynamic = "force-dynamic";
export default async function EditLoanItemPage({ params }: { params: { id: string } }) {
  const access = await requirePagePermission(PERMISSIONS.LOANS_MANAGE);
  if (!can(access, PERMISSIONS.LOANS_VIEW)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_loan_items");
  if (error) throw new Error("Não foi possível consultar exemplares.");
  const item = (data as LoanItem[]).find((entry) => entry.id === params.id);
  if (!item) notFound();
  return <div className="mx-auto max-w-xl space-y-5"><div><Link href="/loans?tab=available" className="text-sm text-brand-600">← Exemplares</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Editar exemplar</h1></div><ItemForm item={item} /></div>;
}
