import Link from "next/link";
import { requireTenant } from "@/lib/supabase/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ToggleProductActive, DeleteProductButton } from "./actions";

export const dynamic = "force-dynamic";

async function getProducts(query?: string) {
  const { supabase } = await requireTenant();
  let q = supabase
    .from("products")
    .select(
      "id, name, sku, unit, cost_price, sale_price, min_stock, current_stock, active",
    )
    .order("name", { ascending: true });

  if (query) {
    q = q.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts(params.q);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Produtos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre e gerencie seus produtos
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Novo produto
        </Link>
      </div>

      {/* Busca */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou SKU..."
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Nenhum produto cadastrado. Crie o primeiro!
          </p>
          <Link
            href="/products/new"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Novo produto
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
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Custo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Venda
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Estoque
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {products.map((p) => {
                  const lowStock =
                    p.min_stock > 0 && p.current_stock <= p.min_stock;
                  return (
                    <tr
                      key={p.id}
                      className={!p.active ? "opacity-50" : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {p.name}
                        </div>
                        {!p.active && (
                          <Badge variant="default" className="mt-1">
                            Inativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {formatCurrency(Number(p.cost_price))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(Number(p.sale_price))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            lowStock ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {p.current_stock} {p.unit}
                        </span>
                        {lowStock && (
                          <p className="text-xs text-amber-600">
                            (mín. {p.min_stock})
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${p.id}/edit`}
                            className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          >
                            Editar
                          </Link>
                          <ToggleProductActive id={p.id} active={p.active} />
                          <DeleteProductButton id={p.id} name={p.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards - mobile */}
          <div className="space-y-3 md:hidden">
            {products.map((p) => {
              const lowStock =
                p.min_stock > 0 && p.current_stock <= p.min_stock;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.sku || "Sem SKU"} • {p.unit}
                      </p>
                    </div>
                    {lowStock && <Badge variant="warning">Estoque baixo</Badge>}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Custo</p>
                      <p className="font-medium">
                        {formatCurrency(Number(p.cost_price))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Venda</p>
                      <p className="font-medium">
                        {formatCurrency(Number(p.sale_price))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estoque</p>
                      <p
                        className={`font-semibold ${
                          lowStock ? "text-amber-600" : "text-slate-900"
                        }`}
                      >
                        {p.current_stock}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-3 border-t border-slate-100 pt-3">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="text-sm font-medium text-brand-600"
                    >
                      Editar
                    </Link>
                    <ToggleProductActive id={p.id} active={p.active} />
                    <DeleteProductButton id={p.id} name={p.name} />
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
