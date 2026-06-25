import Link from "next/link";
import { requireTenant } from "@/lib/supabase/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, { label: string; variant: "success" | "danger" | "info" }> = {
  IN: { label: "Entrada", variant: "success" },
  OUT: { label: "Saída", variant: "danger" },
  ADJUST: { label: "Ajuste", variant: "info" },
};

export default async function StockPage() {
  const { supabase } = await requireTenant();
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("id, type, quantity, unit_cost, notes, created_at, product:products(name, unit)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Movimentações
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Entradas, saídas e ajustes de estoque
          </p>
        </div>
        <Link
          href="/stock/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Nova movimentação
        </Link>
      </div>

      {(!movements || movements.length === 0) ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">Nenhuma movimentação registrada ainda.</p>
          <Link
            href="/stock/new"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Criar primeira movimentação
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
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Custo unit.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Observação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {movements.map((m) => {
                  const t = TYPE_LABEL[m.type];
                  const product = Array.isArray(m.product) ? m.product[0] : m.product;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {product?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={t.variant}>{t.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {m.type === "OUT" ? "−" : m.type === "IN" ? "+" : ""}
                        {m.quantity} {product?.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        {m.unit_cost ? formatCurrency(Number(m.unit_cost)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista - mobile */}
          <div className="space-y-2 md:hidden">
            {movements.map((m) => {
              const t = TYPE_LABEL[m.type];
              const product = Array.isArray(m.product) ? m.product[0] : m.product;
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {product?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <Badge variant={t.variant}>{t.label}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900">
                      {m.type === "OUT" ? "−" : m.type === "IN" ? "+" : ""}
                      {m.quantity} {product?.unit}
                    </span>
                    {m.unit_cost && (
                      <span className="text-slate-500">
                        {formatCurrency(Number(m.unit_cost))}/un
                      </span>
                    )}
                  </div>
                  {m.notes && (
                    <p className="mt-2 text-xs text-slate-500">{m.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
