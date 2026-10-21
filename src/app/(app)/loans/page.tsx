import Link from "next/link";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { type ItemLoan, type LoanItem } from "@/lib/loans";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
type Tab = "open" | "available" | "history";
const tabs: { key: Tab; label: string }[] = [
  { key: "open", label: "Pendentes" }, { key: "available", label: "Exemplares" },
  { key: "history", label: "Histórico" },
];

export default async function LoansPage({ searchParams }: { searchParams: { tab?: string } }) {
  const access = await requirePagePermission(PERMISSIONS.LOANS_VIEW);
  const tab: Tab = tabs.some((item) => item.key === searchParams.tab) ? searchParams.tab as Tab : "open";
  const supabase = await createClient();
  const { data, error } = tab === "available"
    ? await supabase.rpc("list_loan_items")
    : await supabase.rpc("list_item_loans", { p_status: tab === "history" ? "RETURNED" : "OPEN", p_limit: 200 });
  if (error) throw new Error("Não foi possível carregar empréstimos. Verifique a migration 0025.");
  const items = tab === "available" ? data as LoanItem[] : [];
  const loans = tab !== "available" ? data as ItemLoan[] : [];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Empréstimos</h1><p className="mt-1 text-sm text-slate-500">Exemplares do condomínio, entregas e devoluções</p></div>
      <div className="flex flex-wrap gap-2">{can(access, PERMISSIONS.LOANS_MANAGE) && <Link href="/loans/items/new" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cadastrar exemplar</Link>}
        {can(access, PERMISSIONS.LOANS_LEND) && <Link href="/loans/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Registrar empréstimo</Link>}</div>
    </div>
    <nav aria-label="Seções de empréstimos" className="flex gap-1 border-b border-slate-200">{tabs.map((item) => <Link key={item.key} href={`/loans?tab=${item.key}`} aria-current={tab === item.key ? "page" : undefined} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === item.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}>{item.label}</Link>)}</nav>
    <Card><CardHeader><CardTitle>{tabs.find((item) => item.key === tab)?.label}</CardTitle></CardHeader><CardContent>
      {tab === "available" ? items.length === 0 ? <p className="text-sm text-slate-600">Nenhum exemplar cadastrado.</p> : <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><strong className="text-slate-900">{item.name} · {item.identifier}</strong>{item.description && <p className="text-xs text-slate-500">{item.description}</p>}</div><div className="flex items-center gap-3"><Badge variant={item.available ? "success" : "warning"}>{!item.active ? "Inativo" : item.available ? "Disponível" : "Emprestado"}</Badge>{can(access, PERMISSIONS.LOANS_MANAGE) && <Link href={`/loans/items/${item.id}/edit`} className="font-medium text-brand-600">Editar</Link>}</div></div>)}</div>
        : loans.length === 0 ? <p className="text-sm text-slate-600">{tab === "open" ? "Nenhum empréstimo pendente." : "Nenhuma devolução registrada."}</p>
        : <div className="divide-y divide-slate-100">{loans.map((loan) => <div key={loan.id} className="grid gap-3 py-4 text-sm sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-center"><div><strong className="text-slate-900">{loan.item_name} · {loan.item_identifier}</strong><p className="mt-1 text-xs text-slate-500">Retirado {formatDateTime(loan.checked_out_at)}{loan.checked_out_by_name ? ` por ${loan.checked_out_by_name}` : ""}</p></div><div><strong>{loan.borrower_name}</strong>{loan.borrower_affiliation && <p className="text-xs text-slate-500">{loan.borrower_affiliation}</p>}</div><div>{tab === "open" ? <Badge variant="warning">Pendente</Badge> : <><Badge variant="success">Devolvido</Badge><p className="mt-1 text-xs text-slate-500">{loan.returned_at && formatDateTime(loan.returned_at)}</p></>}</div><div>{tab === "open" && can(access, PERMISSIONS.LOANS_RETURN) && <Link href={`/loans/${loan.id}/return`} className="font-medium text-brand-600">Registrar devolução →</Link>}</div>{tab === "history" && loan.return_notes && <p className="text-xs text-slate-500 sm:col-span-4">Condição: {loan.return_notes}</p>}</div>)}</div>}
      {tab !== "available" && loans.length === 200 && <p className="mt-4 text-xs text-slate-500">Exibindo os primeiros 200 registros.</p>}
    </CardContent></Card>
  </div>;
}
