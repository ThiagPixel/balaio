import Link from "next/link";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { type LoanItem } from "@/lib/loans";
import { CheckoutForm } from "../loan-forms";

export const dynamic = "force-dynamic";
export default async function NewLoanPage() {
  const access = await requirePagePermission(PERMISSIONS.LOANS_LEND);
  if (!can(access, PERMISSIONS.LOANS_VIEW)) return <p>É necessária permissão para consultar os exemplares.</p>;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_loan_items");
  if (error) throw new Error("Não foi possível consultar exemplares.");
  const items = (data as LoanItem[]).filter((item) => item.available);
  return <div className="mx-auto max-w-xl space-y-5"><div><Link href="/loans" className="text-sm text-brand-600">← Empréstimos</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Registrar empréstimo</h1><p className="mt-1 text-sm text-slate-600">A confirmação pela administração autoriza o empréstimo.</p></div>{items.length ? <CheckoutForm items={items} /> : <p className="rounded-lg border bg-white p-6 text-sm text-slate-600">Nenhum exemplar disponível. Cadastre um novo ou aguarde uma devolução.</p>}</div>;
}
