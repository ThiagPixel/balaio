import Link from "next/link";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/supabase/access";
import { ItemForm } from "../../loan-forms";

export default async function NewLoanItemPage() {
  await requirePagePermission(PERMISSIONS.LOANS_MANAGE);
  return <div className="mx-auto max-w-xl space-y-5"><div><Link href="/loans?tab=available" className="text-sm text-brand-600">← Exemplares</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Cadastrar exemplar</h1><p className="mt-1 text-sm text-slate-600">Cada cópia ou objeto emprestável precisa de identificação própria.</p></div><ItemForm /></div>;
}
