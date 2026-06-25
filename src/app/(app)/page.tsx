import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireTenant } from "@/lib/supabase/tenant";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const { supabase } = await requireTenant();
  const today = new Date().toISOString().slice(0, 10);
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().slice(0, 10);

  const [
    { count: productsCount },
    { data: lowStockProducts },
    { data: allTransactions },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("products")
      .select("id, name, current_stock, min_stock")
      .eq("active", true),
    supabase
      .from("transactions")
      .select("id, type, amount, due_date, status, description")
      .order("due_date", { ascending: true })
      .limit(200),
  ]);

  // Calcular totais
  let incomePending = 0;
  let expensePending = 0;
  let incomeReceived = 0;
  let expensePaid = 0;
  const overdue: { id: string; description: string; amount: number; due_date: string }[] = [];
  const upcoming: { id: string; type: string; description: string; amount: number; due_date: string }[] = [];

  for (const t of allTransactions ?? []) {
    if (t.type === "INCOME") {
      if (t.status === "PENDING") incomePending += Number(t.amount);
      else if (t.status === "PAID") incomeReceived += Number(t.amount);
    } else {
      if (t.status === "PENDING") expensePending += Number(t.amount);
      else if (t.status === "PAID") expensePaid += Number(t.amount);
    }
    if (t.status === "PENDING") {
      if (isOverdue(t.due_date, t.status)) {
        overdue.push({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          due_date: t.due_date,
        });
      } else if (t.due_date <= next7Str) {
        upcoming.push({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          due_date: t.due_date,
        });
      }
    }
  }

  const stockLow = (lowStockProducts ?? []).filter(
    (p) => p.min_stock > 0 && p.current_stock <= p.min_stock
  );

  return {
    productsCount: productsCount ?? 0,
    stockLow: stockLow.slice(0, 5),
    incomeReceived,
    expensePaid,
    incomePending,
    expensePending,
    balance: incomeReceived - expensePaid,
    overdue: overdue.slice(0, 5),
    upcoming: upcoming.slice(0, 5),
    today,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

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

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo do período</CardDescription>
            <CardTitle
              className={
                data.balance >= 0 ? "text-emerald-600" : "text-red-600"
              }
            >
              {formatCurrency(data.balance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Receitas - Despesas pagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A receber</CardDescription>
            <CardTitle className="text-sky-600">
              {formatCurrency(data.incomePending)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Contas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A pagar</CardDescription>
            <CardTitle className="text-amber-600">
              {formatCurrency(data.expensePending)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Contas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Produtos ativos</CardDescription>
            <CardTitle>{data.productsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">No cadastro</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Atrasados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚠️ Em atraso
              {data.overdue.length > 0 && (
                <Badge variant="danger">{data.overdue.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Contas pendentes com vencimento passado</CardDescription>
          </CardHeader>
          <CardContent>
            {data.overdue.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conta em atraso. 👍</p>
            ) : (
              <ul className="space-y-3">
                {data.overdue.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {t.description}
                      </p>
                      <p className="text-xs text-red-600">
                        Venceu em {formatDate(t.due_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-red-600">
                      {formatCurrency(t.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/financial"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver financeiro →
            </Link>
          </CardContent>
        </Card>

        {/* Próximos vencimentos */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Próximos 7 dias</CardTitle>
            <CardDescription>Vencimentos que estão chegando</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum vencimento nos próximos dias.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {t.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.type === "INCOME" ? "A receber" : "A pagar"} •{" "}
                        {formatDate(t.due_date)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/financial"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver financeiro →
            </Link>
          </CardContent>
        </Card>

        {/* Estoque baixo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Estoque baixo
              {data.stockLow.length > 0 && (
                <Badge variant="warning">{data.stockLow.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Produtos abaixo do estoque mínimo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.stockLow.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todos os produtos estão com estoque saudável.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.stockLow.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Mínimo: {p.min_stock}
                      </p>
                    </div>
                    <Badge variant="warning">
                      {p.current_stock} em estoque
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver produtos →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
