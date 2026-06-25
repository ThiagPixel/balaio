import Link from "next/link";
import { requireTenant } from "@/lib/supabase/tenant";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";
import { TransactionStatusButtons, DeleteTransactionButton } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; variant: "warning" | "success" | "default" | "danger" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PAID: { label: "Pago", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireTenant();

  let q = supabase
    .from("transactions")
    .select("id, type, category, description, amount, due_date, paid_at, status, notes")
    .order("due_date", { ascending: true });

  if (params.type && (params.type === "INCOME" || params.type === "EXPENSE")) {
    q = q.eq("type", params.type);
  }
  if (params.status && ["PENDING", "PAID", "CANCELLED"].includes(params.status)) {
    q = q.eq("status", params.status);
  }

  const { data: transactions } = await q;

  // Totais
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;
  for (const t of transactions ?? []) {
    if (t.type === "INCOME") {
      totalIncome += Number(t.amount);
      if (t.status === "PENDING") pendingIncome += Number(t.amount);
    } else {
      totalExpense += Number(t.amount);
      if (t.status === "PENDING") pendingExpense += Number(t.amount);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Contas a pagar e a receber
          </p>
        </div>
        <Link
          href="/financial/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Novo lançamento
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Receitas pendentes</p>
          <p className="mt-1 text-lg font-semibold text-sky-600 sm:text-xl">
            {formatCurrency(pendingIncome)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Despesas pendentes</p>
          <p className="mt-1 text-lg font-semibold text-amber-600 sm:text-xl">
            {formatCurrency(pendingExpense)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total receitas</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600 sm:text-xl">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total despesas</p>
          <p className="mt-1 text-lg font-semibold text-red-600 sm:text-xl">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <FilterLink href="/financial" current={params} label="Todas" />
        <FilterLink href="/financial?type=INCOME" current={params} label="A receber" paramName="type" paramValue="INCOME" />
        <FilterLink href="/financial?type=EXPENSE" current={params} label="A pagar" paramName="type" paramValue="EXPENSE" />
        <FilterLink href="/financial?status=PENDING" current={params} label="Pendentes" paramName="status" paramValue="PENDING" />
        <FilterLink href="/financial?status=PAID" current={params} label="Pagas" paramName="status" paramValue="PAID" />
      </div>

      {(!transactions || transactions.length === 0) ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">Nenhum lançamento encontrado.</p>
          <Link
            href="/financial/new"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Criar primeiro lançamento
          </Link>
        </div>
      ) : (
        <>
          {/* Tabela - desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {transactions.map((t) => {
                  const overdue = isOverdue(t.due_date, t.status);
                  const badge = STATUS_BADGE[t.status];
                  return (
                    <tr key={t.id} className={t.status === "CANCELLED" ? "opacity-50" : undefined}>
                      <td className="px-4 py-3 text-sm">
                        <span className={overdue ? "font-semibold text-red-600" : "text-slate-700"}>
                          {formatDate(t.due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {t.type === "INCOME" ? "📈" : "📉"}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {t.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.category}</td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-semibold ${
                          t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "−"}
                        {formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {overdue && (
                          <p className="mt-1 text-xs text-red-600">Atrasado</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <TransactionStatusButtons id={t.id} status={t.status} />
                          <DeleteTransactionButton id={t.id} description={t.description} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards - mobile */}
          <div className="space-y-2 md:hidden">
            {transactions.map((t) => {
              const overdue = isOverdue(t.due_date, t.status);
              const badge = STATUS_BADGE[t.status];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {t.type === "INCOME" ? "📈" : "📉"} {t.description}
                      </p>
                      <p className="text-xs text-slate-500">{t.category}</p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        overdue ? "font-semibold text-red-600" : "text-slate-600"
                      }`}
                    >
                      {formatDate(t.due_date)}
                      {overdue && " (atrasado)"}
                    </span>
                    <span
                      className={`text-base font-semibold ${
                        t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-3 border-t border-slate-100 pt-3">
                    <TransactionStatusButtons id={t.id} status={t.status} />
                    <DeleteTransactionButton id={t.id} description={t.description} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FilterLink({
  href,
  current,
  label,
  paramName,
  paramValue,
}: {
  href: string;
  current: { type?: string; status?: string };
  label: string;
  paramName?: string;
  paramValue?: string;
}) {
  const isActive = paramName
    ? current[paramName as keyof typeof current] === paramValue
    : !current.type && !current.status;

  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-600 text-white"
          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}
