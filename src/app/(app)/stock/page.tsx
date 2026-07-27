import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateTime,
} from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

type StockMovementItem = {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  product_name: string;
  product_unit: string;
  created_by_name: string | null;
  created_by_email: string | null;
};

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<
  string,
  {
    label: string;
    variant:
      | "success"
      | "danger"
      | "info";
  }
> = {
  IN: {
    label: "Entrada",
    variant: "success",
  },

  OUT: {
    label: "Saída",
    variant: "danger",
  },

  ADJUST: {
    label: "Ajuste",
    variant: "info",
  },
};

export default async function StockPage() {
  const access =
    await requirePagePermission(
      PERMISSIONS.STOCK_VIEW,
    );

  const canViewCost = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW_COST,
  );

  const canCreateMovement =
    can(
      access,
      PERMISSIONS.STOCK_IN,
    ) ||
    can(
      access,
      PERMISSIONS.STOCK_OUT,
    ) ||
    can(
      access,
      PERMISSIONS.STOCK_ADJUST,
    );

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "list_stock_movements",
      {
        p_limit: 100,
      },
    );

  if (error) {
    console.error(
      "Erro ao carregar movimentações:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar as movimentações.",
    );
  }

  const movements = (data ?? []) as StockMovementItem[];

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

        {canCreateMovement && (
          <Link
            href="/stock/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Nova movimentação
          </Link>
        )}
      </div>

      {movements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Nenhuma movimentação registrada ainda.
          </p>

          {canCreateMovement && (
            <Link
              href="/stock/new"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Criar primeira movimentação
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop */}
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

                  {canViewCost && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Custo unit.
                    </th>
                  )}

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Responsável
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Observação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {movements.map(
                  (movement) => {
                    const type =
                      TYPE_LABEL[
                        movement.movement_type
                      ] ?? {
                        label:
                          movement.movement_type,
                        variant:
                          "info" as const,
                      };

                    const responsible =
                      movement.created_by_name ||
                      movement.created_by_email ||
                      "Sistema";

                    return (
                      <tr key={movement.id}>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDateTime(
                            movement.created_at,
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {
                            movement.product_name
                          }
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              type.variant
                            }
                          >
                            {type.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {movement.movement_type ===
                          "OUT"
                            ? "−"
                            : movement.movement_type ===
                                "IN"
                              ? "+"
                              : ""}

                          {movement.quantity}{" "}
                          {
                            movement.product_unit
                          }
                        </td>

                        {canViewCost && (
                          <td className="px-4 py-3 text-right text-sm text-slate-600">
                            {movement.unit_cost !==
                            null
                              ? formatCurrency(
                                  Number(
                                    movement.unit_cost,
                                  ),
                                )
                              : "—"}
                          </td>
                        )}

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {responsible}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-500">
                          {movement.notes ||
                            "—"}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {movements.map(
              (movement) => {
                const type =
                  TYPE_LABEL[
                    movement.movement_type
                  ] ?? {
                    label:
                      movement.movement_type,
                    variant:
                      "info" as const,
                  };

                const responsible =
                  movement.created_by_name ||
                  movement.created_by_email ||
                  "Sistema";

                return (
                  <div
                    key={movement.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {
                            movement.product_name
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatDateTime(
                            movement.created_at,
                          )}
                        </p>
                      </div>

                      <Badge
                        variant={type.variant}
                      >
                        {type.label}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">
                        {movement.movement_type ===
                        "OUT"
                          ? "−"
                          : movement.movement_type ===
                              "IN"
                            ? "+"
                            : ""}

                        {movement.quantity}{" "}
                        {
                          movement.product_unit
                        }
                      </span>

                      {canViewCost &&
                        movement.unit_cost !==
                          null && (
                          <span className="text-slate-500">
                            {formatCurrency(
                              Number(
                                movement.unit_cost,
                              ),
                            )}
                            /un
                          </span>
                        )}
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Por: {responsible}
                    </p>

                    {movement.notes && (
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.notes}
                      </p>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </div>
  );
}