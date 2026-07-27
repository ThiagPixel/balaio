import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DeleteProductButton,
  ToggleProductActive,
} from "./actions";

type ProductListItem = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  cost_price: number | null;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const dynamic = "force-dynamic";

async function getProducts(
  query?: string,
): Promise<ProductListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "list_products",
    {
      p_query: query?.trim() || null,
    },
  );

  if (error) {
    console.error("Erro ao listar produtos:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(
      "Não foi possível carregar os produtos.",
    );
  }

  return (data ?? []) as ProductListItem[];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;

  /**
   * Impede o acesso à página quando o usuário não possui
   * permissão para visualizar produtos.
   */
  const access = await requirePagePermission(
    PERMISSIONS.PRODUCTS_VIEW,
  );

  const products = await getProducts(params.q);

  /**
   * As verificações abaixo controlam somente a renderização
   * da interface.
   *
   * As Server Actions continuam validando novamente as
   * permissões antes de executar qualquer alteração.
   */
  const canViewCost = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW_COST,
  );

  const canCreate = can(
    access,
    PERMISSIONS.PRODUCTS_CREATE,
  );

  const canUpdate = can(
    access,
    PERMISSIONS.PRODUCTS_UPDATE,
  );

  const canToggleActive = can(
    access,
    PERMISSIONS.PRODUCTS_TOGGLE_ACTIVE,
  );

  const canDelete = can(
    access,
    PERMISSIONS.PRODUCTS_DELETE,
  );

  const hasProductActions =
    canUpdate ||
    canToggleActive ||
    canDelete;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Produtos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre e gerencie seus produtos
          </p>
        </div>

        {canCreate && (
          <Link
            href="/products/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Novo produto
          </Link>
        )}
      </div>

      {/* Busca */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou SKU..."
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />

        <Button
          type="submit"
          variant="outline"
        >
          Buscar
        </Button>
      </form>

      {/* Estado vazio */}
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            {canCreate
              ? "Nenhum produto cadastrado. Crie o primeiro!"
              : "Nenhum produto cadastrado."}
          </p>

          {canCreate && (
            <Link
              href="/products/new"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Novo produto
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Tabela para desktop */}
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

                  {canViewCost && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Custo
                    </th>
                  )}

                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Venda
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Estoque
                  </th>

                  {hasProductActions && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {products.map((product) => {
                  const lowStock =
                    product.min_stock > 0 &&
                    product.current_stock <=
                      product.min_stock;

                  return (
                    <tr
                      key={product.id}
                      className={
                        !product.active
                          ? "opacity-50"
                          : undefined
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {product.name}
                        </div>

                        {!product.active && (
                          <Badge
                            variant="default"
                            className="mt-1"
                          >
                            Inativo
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {product.sku || "—"}
                      </td>

                      {canViewCost && (
                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatCurrency(
                            Number(
                              product.cost_price,
                            ),
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(
                          Number(
                            product.sale_price,
                          ),
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            lowStock
                              ? "text-amber-600"
                              : "text-slate-900"
                          }`}
                        >
                          {product.current_stock}{" "}
                          {product.unit}
                        </span>

                        {lowStock && (
                          <p className="text-xs text-amber-600">
                            (mín.{" "}
                            {product.min_stock})
                          </p>
                        )}
                      </td>

                      {hasProductActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canUpdate && (
                              <Link
                                href={`/products/${product.id}/edit`}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Editar
                              </Link>
                            )}

                            {canToggleActive && (
                              <ToggleProductActive
                                id={product.id}
                                active={
                                  product.active
                                }
                              />
                            )}

                            {canDelete && (
                              <DeleteProductButton
                                id={product.id}
                                name={
                                  product.name
                                }
                              />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards para mobile */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => {
              const lowStock =
                product.min_stock > 0 &&
                product.current_stock <=
                  product.min_stock;

              return (
                <div
                  key={product.id}
                  className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
                    !product.active
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {product.name}
                        </p>

                        {!product.active && (
                          <Badge variant="default">
                            Inativo
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        {product.sku ||
                          "Sem SKU"}{" "}
                        • {product.unit}
                      </p>
                    </div>

                    {lowStock && (
                      <Badge variant="warning">
                        Estoque baixo
                      </Badge>
                    )}
                  </div>

                  <div
                    className={`mt-3 grid gap-2 text-sm ${
                      canViewCost
                        ? "grid-cols-3"
                        : "grid-cols-2"
                    }`}
                  >
                    {canViewCost && (
                      <div>
                        <p className="text-xs text-slate-500">
                          Custo
                        </p>

                        <p className="font-medium">
                          {formatCurrency(
                            Number(
                              product.cost_price,
                            ),
                          )}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-slate-500">
                        Venda
                      </p>

                      <p className="font-medium">
                        {formatCurrency(
                          Number(
                            product.sale_price,
                          ),
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Estoque
                      </p>

                      <p
                        className={`font-semibold ${
                          lowStock
                            ? "text-amber-600"
                            : "text-slate-900"
                        }`}
                      >
                        {product.current_stock}
                      </p>
                    </div>
                  </div>

                  {hasProductActions && (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                      {canUpdate && (
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-sm font-medium text-brand-600"
                        >
                          Editar
                        </Link>
                      )}

                      {canToggleActive && (
                        <ToggleProductActive
                          id={product.id}
                          active={
                            product.active
                          }
                        />
                      )}

                      {canDelete && (
                        <DeleteProductButton
                          id={product.id}
                          name={
                            product.name
                          }
                        />
                      )}
                    </div>
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