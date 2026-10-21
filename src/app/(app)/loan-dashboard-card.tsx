"use client";

import { useState } from "react";
import Link from "next/link";
import type { LoanDashboard } from "@/lib/loans";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoanDashboardCard({ data, canLend }: { data: LoanDashboard; canLend: boolean }) {
  const [open, setOpen] = useState(false);
  return <Card className="lg:col-span-2">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle className="flex flex-wrap items-center gap-2">🔑 Empréstimos pendentes <Badge variant="warning">{data.open}</Badge></CardTitle><p className="mt-1 text-sm text-slate-500">Itens do condomínio aguardando devolução</p></div>
      <div className="flex flex-wrap items-center gap-3 text-sm"><Link href="/loans" className="font-medium text-brand-600">Ver empréstimos →</Link>{canLend && <Link href="/loans/new" className="rounded-md bg-brand-600 px-3 py-2 font-medium text-white">Registrar empréstimo</Link>}<button type="button" aria-label={open ? "Recolher empréstimos" : "Expandir empréstimos"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">{open ? "⌃" : "⌄"}</button></div>
    </CardHeader>
    {open && <CardContent><div className="border-t border-slate-100 pt-4 text-sm"><strong className="block text-xl">{data.open}</strong><span className="text-slate-500">pendentes de devolução</span></div>
      {data.urgent.length ? <div className="mt-4 divide-y divide-slate-100">{data.urgent.map((item, index) => <div key={`${item.item_identifier}-${index}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-center"><strong>{item.item_name} · {item.item_identifier}</strong><span>{item.borrower_name}</span><span>Retirado: {formatDateTime(item.checked_out_at)}</span><Badge variant="warning">Pendente</Badge></div>)}</div> : <p className="mt-4 text-sm text-slate-600">Nenhum item aguardando devolução.</p>}
      <Link href="/loans" className="mt-4 inline-block text-sm font-medium text-brand-600">Ver todos os empréstimos →</Link>
    </CardContent>}
  </Card>;
}
