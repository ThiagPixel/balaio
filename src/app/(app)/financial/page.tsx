import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  isOverdue,
} from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

import {
  DeleteTransactionButton,
  TransactionStatusButtons,
} from "./actions";

export const dynamic = "force-dynamic";

type TransactionType =
  | "INCOME"
  | "EXPENSE";

type TransactionStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED";

type FinancialTransaction = {
  id: string;
  transaction_type: TransactionType;
  category: string;
  description: string;
  amount: number | string;
  due_date: string;
  paid_at: string | null;
  transaction_status: TransactionStatus;
  notes: string | null;
  created_at: string;
};

type FinancialSearchParams = {
  type?: string;
  status?: string;
};

const STATUS_BADGE: Record<
  TransactionStatus,
  {
    label: string;
    variant:
      | "warning"
      | "success"
      | "default"
      | "danger";
  }
> = {
  PENDING: {
    label: "Pendente",
    variant: "warning",
  },

  PAID: {
    label: "Pago",
    variant: "success",
  },

  CANCELLED: {
    label: "Cancelado",
    variant: "default",
  },
};

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<FinancialSearchParams>;
}) {
  const params = await searchParams;

  /**
   * Sem finance.view, o usuário não consegue acessar
   * nem carregar os dados financeiros.
   */
  const access =
    await requirePagePermission(
      PERMISSIONS.FINANCE_VIEW,
    );

  const canCreate = can(
    access,
    PERMISSIONS.FINANCE_CREATE,
  );

  const canSettle = can(
    access,
    PERMISSIONS.FINANCE_SETTLE,
  );

  const canReopen = can(
    access,
    PERMISSIONS.FINANCE_REOPEN,
  );

  const canCancel = can(
    access,
    PERMISSIONS.FINANCE_CANCEL,
  );

  const canDelete = can(
    access,
    PERMISSIONS.FINANCE_DELETE,
  );

  const hasActions =
    canSettle ||
    canReopen ||
    canCancel ||
    canDelete;

  const typeFilter:
    | TransactionType
    | null =
    params.type === "INCOME" ||
    params.type === "EXPENSE"
      ? params.type
      : null;

  const statusFilter:
    | TransactionStatus
    | null =
    params.status === "PENDING" ||
    params.status === "PAID" ||
    params.status === "CANCELLED"
      ? params.status
      : null;

  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "list_financial_transactions",
      {
        p_type: typeFilter,
        p_status: statusFilter,
      },
    );

  if (error) {
    console.error(
      "Erro ao carregar financeiro:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar o financeiro.",
    );
  }

  const transactions =
    (data ??
      []) as FinancialTransaction[];

  /**
   * Mantém o mesmo comportamento da página anterior:
   * os totais são calculados sobre os lançamentos
   * retornados pelo filtro atual.
   */
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;

  for (const transaction of transactions) {
    const amount = Number(
      transaction.amount,
    );

    if (
      transaction.transaction_type ===
      "INCOME"
    ) {
      totalIncome += amount;

      if (
        transaction.transaction_status ===
        "PENDING"
      ) {
        pendingIncome += amount;
      }
    } else {
      totalExpense += amount;

      if (
        transaction.transaction_status ===
        "PENDING"
      ) {
        pendingExpense += amount;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Financeiro
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Contas a pagar e a receber
          </p>
        </div>

        {canCreate && (
          <Link
            href="/financial/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Novo lançamento
          </Link>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            Receitas pendentes
          </p>

          <p className="mt-1 text-lg font-semibold text-sky-600 sm:text-xl">
            {formatCurrency(
              pendingIncome,
            )}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            Despesas pendentes
          </p>

          <p className="mt-1 text-lg font-semibold text-amber-600 sm:text-xl">
            {formatCurrency(
              pendingExpense,
            )}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            Total receitas
          </p>

          <p className="mt-1 text-lg font-semibold text-emerald-600 sm:text-xl">
            {formatCurrency(
              totalIncome,
            )}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            Total despesas
          </p>

          <p className="mt-1 text-lg font-semibold text-red-600 sm:text-xl">
            {formatCurrency(
              totalExpense,
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <FilterLink
          href="/financial"
          current={params}
          label="Todas"
        />

        <FilterLink
          href="/financial?type=INCOME"
          current={params}
          label="A receber"
          paramName="type"
          paramValue="INCOME"
        />

        <FilterLink
          href="/financial?type=EXPENSE"
          current={params}
          label="A pagar"
          paramName="type"
          paramValue="EXPENSE"
        />

        <FilterLink
          href="/financial?status=PENDING"
          current={params}
          label="Pendentes"
          paramName="status"
          paramValue="PENDING"
        />

        <FilterLink
          href="/financial?status=PAID"
          current={params}
          label="Pagas"
          paramName="status"
          paramValue="PAID"
        />

        <FilterLink
          href="/financial?status=CANCELLED"
          current={params}
          label="Canceladas"
          paramName="status"
          paramValue="CANCELLED"
        />
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Nenhum lançamento encontrado.
          </p>

          {canCreate && (
            <Link
              href="/financial/new"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Criar primeiro lançamento
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

                  {hasActions && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {transactions.map(
                  (transaction) => {
                    const status =
                      transaction.transaction_status;

                    const type =
                      transaction.transaction_type;

                    const overdue =
                      isOverdue(
                        transaction.due_date,
                        status,
                      );

                    const badge =
                      STATUS_BADGE[status];

                    const rowHasActions =
                      canDelete ||
                      (status ===
                        "PENDING" &&
                        (canSettle ||
                          canCancel)) ||
                      (status ===
                        "PAID" &&
                        (canReopen ||
                          canCancel));

                    return (
                      <tr
                        key={transaction.id}
                        className={
                          status ===
                          "CANCELLED"
                            ? "opacity-50"
                            : undefined
                        }
                      >
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={
                              overdue
                                ? "font-semibold text-red-600"
                                : "text-slate-700"
                            }
                          >
                            {formatDate(
                              transaction.due_date,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {type ===
                              "INCOME"
                                ? "📈"
                                : "📉"}
                            </span>

                            <span className="text-sm font-medium text-slate-900">
                              {
                                transaction.description
                              }
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {
                            transaction.category
                          }
                        </td>

                        <td
                          className={`px-4 py-3 text-right text-sm font-semibold ${
                            type === "INCOME"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {type === "INCOME"
                            ? "+"
                            : "−"}

                          {formatCurrency(
                            Number(
                              transaction.amount,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              badge.variant
                            }
                          >
                            {badge.label}
                          </Badge>

                          {overdue && (
                            <p className="mt-1 text-xs text-red-600">
                              Atrasado
                            </p>
                          )}
                        </td>

                        {hasActions && (
                          <td className="px-4 py-3 text-right">
                            {rowHasActions && (
                              <div className="flex flex-wrap justify-end gap-3">
                                <TransactionStatusButtons
                                  id={
                                    transaction.id
                                  }
                                  status={
                                    status
                                  }
                                  canSettle={
                                    canSettle
                                  }
                                  canReopen={
                                    canReopen
                                  }
                                  canCancel={
                                    canCancel
                                  }
                                />

                                {canDelete && (
                                  <DeleteTransactionButton
                                    id={
                                      transaction.id
                                    }
                                    description={
                                      transaction.description
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* Cards para mobile */}
          <div className="space-y-2 md:hidden">
            {transactions.map(
              (transaction) => {
                const status =
                  transaction.transaction_status;

                const type =
                  transaction.transaction_type;

                const overdue =
                  isOverdue(
                    transaction.due_date,
                    status,
                  );

                const badge =
                  STATUS_BADGE[status];

                const rowHasActions =
                  canDelete ||
                  (status ===
                    "PENDING" &&
                    (canSettle ||
                      canCancel)) ||
                  (status ===
                    "PAID" &&
                    (canReopen ||
                      canCancel));

                return (
                  <div
                    key={
                      transaction.id
                    }
                    className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
                      status ===
                      "CANCELLED"
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {type ===
                          "INCOME"
                            ? "📈"
                            : "📉"}{" "}
                          {
                            transaction.description
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            transaction.category
                          }
                        </p>
                      </div>

                      <Badge
                        variant={
                          badge.variant
                        }
                      >
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span
                        className={`text-sm ${
                          overdue
                            ? "font-semibold text-red-600"
                            : "text-slate-600"
                        }`}
                      >
                        {formatDate(
                          transaction.due_date,
                        )}

                        {overdue &&
                          " (atrasado)"}
                      </span>

                      <span
                        className={`text-base font-semibold ${
                          type === "INCOME"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {type === "INCOME"
                          ? "+"
                          : "−"}

                        {formatCurrency(
                          Number(
                            transaction.amount,
                          ),
                        )}
                      </span>
                    </div>

                    {transaction.notes && (
                      <p className="mt-2 text-xs text-slate-500">
                        {transaction.notes}
                      </p>
                    )}

                    {rowHasActions && (
                      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                        <TransactionStatusButtons
                          id={
                            transaction.id
                          }
                          status={status}
                          canSettle={
                            canSettle
                          }
                          canReopen={
                            canReopen
                          }
                          canCancel={
                            canCancel
                          }
                        />

                        {canDelete && (
                          <DeleteTransactionButton
                            id={
                              transaction.id
                            }
                            description={
                              transaction.description
                            }
                          />
                        )}
                      </div>
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

function FilterLink({
  href,
  current,
  label,
  paramName,
  paramValue,
}: {
  href: string;
  current: FinancialSearchParams;
  label: string;
  paramName?: keyof FinancialSearchParams;
  paramValue?: string;
}) {
  const isActive = paramName
    ? current[paramName] ===
      paramValue
    : !current.type &&
      !current.status;

  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}