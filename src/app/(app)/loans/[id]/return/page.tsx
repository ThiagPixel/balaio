import Link from "next/link";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import type { ItemLoan } from "@/lib/loans";
import { ReturnForm } from "../../loan-forms";

export const dynamic = "force-dynamic";
export default async function ReturnLoanPage({ params }: { params: { id: string } }) {
  const access = await requirePagePermission(PERMISSIONS.LOANS_RETURN);
  if (!can(access, PERMISSIONS.LOANS_VIEW)) redirect("/forbidden");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_item_loans", { p_status: "OPEN", p_limit: 200 });
  if (error) throw new Error("Não foi possível consultar empréstimos.");
  const loan = (data as ItemLoan[]).find((item) => item.id === params.id);
  if (!loan) redirect("/loans");
  return <div className="mx-auto max-w-xl space-y-5"><div><Link href="/loans" className="text-sm text-brand-600">← Empréstimos</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Registrar devolução</h1></div><ReturnForm loan={loan} /></div>;
}
