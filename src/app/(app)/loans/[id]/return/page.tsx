import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { ReturnForm } from "../../loan-forms";

export const dynamic = "force-dynamic";
export default async function ReturnLoanPage({ params }: { params: { id: string } }) {
  const access = await requirePagePermission(PERMISSIONS.LOANS_RETURN);
  if (!can(access, PERMISSIONS.LOANS_VIEW)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_item_loan", { p_loan_id: params.id });
  if (error) throw new Error("Não foi possível consultar empréstimos.");
  const loan = data as { id: string; item_name: string; item_identifier: string; borrower_name: string; checked_out_at: string } | null;
  if (!loan) notFound();
  return <div className="mx-auto max-w-xl space-y-5"><div><Link href="/loans" className="text-sm text-brand-600">← Empréstimos</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Registrar devolução</h1></div><ReturnForm loan={loan} /></div>;
}
