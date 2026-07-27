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
} from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type LowStockProduct = {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
};

type DashboardStockData = {
  products_count: number;
  low_stock: LowStockProduct[];
};

type DashboardFinancialItem = {
  id: string;
  description: string;
  amount: number | string;
  due_date: string;
};

type DashboardUpcomingItem =
  DashboardFinancialItem & {
    type: "INCOME" | "EXPENSE";
  };

type DashboardFinancialData = {
  income_received: number | string;
  expense_paid: number | string;
  income_pending: number | string;
  expense_pending: number | string;
  balance: number | string;
  overdue: DashboardFinancialItem[];
  upcoming: DashboardUpcomingItem[];
};

export default async function DashboardPage() {
  const access =
    await requirePagePermission(
      PERMISSIONS.DASHBOARD_VIEW,
    );

  const canViewStock = can(
    access,
    PERMISSIONS.DASHBOARD_VIEW_STOCK,
  );

  const canViewFinancial = can(
    access,
    PERMISSIONS.DASHBOARD_VIEW_FINANCIAL,
  );

  const canOpenProducts = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW,
  );

  const canOpenFinancial = can(
    access,
    PERMISSIONS.FINANCE_VIEW,
  );

  const supabase = await createClient();

  let stockData: DashboardStockData | null =
    null;

  let financialData:
    | DashboardFinancialData
    | null = null;

  if (canViewStock) {
    const { data, error } =
      await supabase.rpc(
        "get_dashboard_stock_summary",
      );

    if (error) {
      console.error(
        "Erro ao carregar indicadores de estoque:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      throw new Error(
        "Não foi possível carregar os indicadores de estoque.",
      );
    }

    stockData =
      data as DashboardStockData;
  }

  if (canViewFinancial) {
    const { data, error } =
      await supabase.rpc(
        "get_dashboard_financial_summary",
      );

    if (error) {
      console.error(
        "Erro ao carregar indicadores financeiros:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      throw new Error(
        "Não foi possível carregar os indicadores financeiros.",
      );
    }

    financialData =
      data as DashboardFinancialData;
  }

  const hasIndicators =
    Boolean(stockData) ||
    Boolean(financialData);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Visão geral do seu negócio
        </p>
      </div>

      {!hasIndicators && (
        <Card>
          <CardHeader>
            <CardTitle>
              Nenhum indicador disponível
            </CardTitle>

            <CardDescription>
              Sua conta pode acessar a
              dashboard, mas não possui
              permissão para visualizar os
              dados financeiros ou de estoque.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Cards de resumo */}
      {hasIndicators && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {financialData && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Saldo do período
                  </CardDescription>

                  <CardTitle
                    className={
                      Number(
                        financialData.balance,
                      ) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {formatCurrency(
                      Number(
                        financialData.balance,
                      ),
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-xs text-slate-500">
                    Receitas recebidas menos
                    despesas pagas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    A receber
                  </CardDescription>

                  <CardTitle className="text-sky-600">
                    {formatCurrency(
                      Number(
                        financialData.income_pending,
                      ),
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-xs text-slate-500">
                    Receitas pendentes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    A pagar
                  </CardDescription>

                  <CardTitle className="text-amber-600">
                    {formatCurrency(
                      Number(
                        financialData.expense_pending,
                      ),
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-xs text-slate-500">
                    Despesas pendentes
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {stockData && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Produtos ativos
                </CardDescription>

                <CardTitle>
                  {stockData.products_count}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-slate-500">
                  Produtos ativos no cadastro
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {financialData && (
          <>
            {/* Contas em atraso */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚠️ Em atraso

                  {financialData.overdue
                    .length > 0 && (
                    <Badge variant="danger">
                      {
                        financialData.overdue
                          .length
                      }
                    </Badge>
                  )}
                </CardTitle>

                <CardDescription>
                  Contas pendentes com vencimento
                  passado
                </CardDescription>
              </CardHeader>

              <CardContent>
                {financialData.overdue
                  .length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma conta em atraso. 👍
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {financialData.overdue.map(
                      (transaction) => (
                        <li
                          key={transaction.id}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {
                                transaction.description
                              }
                            </p>

                            <p className="text-xs text-red-600">
                              Venceu em{" "}
                              {formatDate(
                                transaction.due_date,
                              )}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrency(
                              Number(
                                transaction.amount,
                              ),
                            )}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                )}

                {canOpenFinancial && (
                  <Link
                    href="/financial"
                    className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Ver financeiro →
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Próximos vencimentos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  📅 Próximos 7 dias
                </CardTitle>

                <CardDescription>
                  Vencimentos que estão chegando
                </CardDescription>
              </CardHeader>

              <CardContent>
                {financialData.upcoming
                  .length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum vencimento nos
                    próximos dias.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {financialData.upcoming.map(
                      (transaction) => (
                        <li
                          key={transaction.id}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {
                                transaction.description
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              {transaction.type ===
                              "INCOME"
                                ? "A receber"
                                : "A pagar"}{" "}
                              •{" "}
                              {formatDate(
                                transaction.due_date,
                              )}
                            </p>
                          </div>

                          <p
                            className={`text-sm font-semibold ${
                              transaction.type ===
                              "INCOME"
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(
                              Number(
                                transaction.amount,
                              ),
                            )}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                )}

                {canOpenFinancial && (
                  <Link
                    href="/financial"
                    className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Ver financeiro →
                  </Link>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Estoque baixo */}
        {stockData && (
          <Card
            className={
              financialData
                ? "lg:col-span-2"
                : "lg:col-span-2"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📦 Estoque baixo

                {stockData.low_stock.length >
                  0 && (
                  <Badge variant="warning">
                    {
                      stockData.low_stock
                        .length
                    }
                  </Badge>
                )}
              </CardTitle>

              <CardDescription>
                Produtos abaixo do estoque mínimo
              </CardDescription>
            </CardHeader>

            <CardContent>
              {stockData.low_stock.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  Todos os produtos estão com
                  estoque saudável.
                </p>
              ) : (
                <ul className="space-y-3">
                  {stockData.low_stock.map(
                    (product) => (
                      <li
                        key={product.id}
                        className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {product.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            Mínimo:{" "}
                            {
                              product.min_stock
                            }
                          </p>
                        </div>

                        <Badge variant="warning">
                          {
                            product.current_stock
                          }{" "}
                          em estoque
                        </Badge>
                      </li>
                    ),
                  )}
                </ul>
              )}

              {canOpenProducts && (
                <Link
                  href="/products"
                  className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Ver produtos →
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}