import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, getAccessContext } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Params = { start?: string; end?: string; product?: string; type?: string };
type Month = { month: string; incoming: number; outgoing: number; adjustments: number };
type Product = { id: string; name: string; unit: string; incoming: number; outgoing: number; adjustments: number };
type StockReport = {
  records: number; active_days: number; adjustments: number;
  incoming: number; outgoing: number; months: Month[]; products: Product[];
};
type MoneyMonth = { month: string; received: number; paid: number };
type Category = { category: string; type: string; total: number };
type FinancialReport = {
  records: number; received: number; paid: number; balance: number;
  months: MoneyMonth[]; categories: Category[];
};
type ProductOption = { id: string; name: string; unit: string };

const count = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const money = (value: number) => formatCurrency(Number(value));
const monthLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(`${value}T12:00:00Z`));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function localDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <Card><CardContent className="p-5">
    <p className="text-sm text-slate-600">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-brand-700">{value}</p>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </CardContent></Card>;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const access = await getAccessContext();
  const stockAllowed = can(access, PERMISSIONS.STOCK_VIEW);
  const financeAllowed = can(access, PERMISSIONS.FINANCE_VIEW);
  if (!stockAllowed && !financeAllowed) redirect("/forbidden");

  const params = await searchParams;
  const today = localDate(new Date());
  const defaultStart = localDate(new Date(Date.now() - 89 * 86400000));
  const start = params.start ?? defaultStart;
  const end = params.end ?? today;
  const datesValid = validDate(start) && validDate(end)
    && start <= end
    && (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000 <= 1096;
  const productValid = !params.product || uuidPattern.test(params.product);
  const typeValid = !params.type || ["IN", "OUT", "ADJUST"].includes(params.type);
  const filterError = !datesValid ? "Selecione um período válido de até três anos."
    : !productValid ? "Selecione um produto válido."
    : !typeValid ? "Selecione um tipo de movimentação válido." : null;

  const supabase = await createClient();
  let products: ProductOption[] = [];
  let stock: StockReport | null = null;
  let financial: FinancialReport | null = null;

  if (stockAllowed) {
    const result = await supabase.rpc("list_report_products");
    if (result.error) throw new Error("Não foi possível carregar os produtos do relatório.");
    products = (result.data ?? []) as ProductOption[];
  }
  const chosenProduct = products.find((item) => item.id === params.product);
  const invalidProduct = Boolean(params.product && stockAllowed && !chosenProduct);

  if (!filterError && !invalidProduct) {
    const [stockResult, financeResult] = await Promise.all([
      stockAllowed ? supabase.rpc("get_stock_report", {
        p_start: start, p_end: end, p_product_id: chosenProduct?.id ?? null,
        p_type: params.type || null,
      }) : Promise.resolve(null),
      financeAllowed ? supabase.rpc("get_financial_report", {
        p_start: start, p_end: end,
      }) : Promise.resolve(null),
    ]);
    if (stockResult?.error || financeResult?.error) {
      console.error("Erro ao carregar relatório", {
        stock: stockResult?.error?.code, finance: financeResult?.error?.code,
      });
      throw new Error("Não foi possível carregar o relatório. Verifique se a migration 0024 foi aplicada.");
    }
    stock = stockResult?.data as StockReport | null;
    financial = financeResult?.data as FinancialReport | null;
  }

  const biggestMonth = stock?.months.reduce<Month | null>((best, current) =>
    !best || current.outgoing > best.outgoing ? current : best, null);
  const sameUnit = stock && new Set(stock.products.map((item) => item.unit)).size === 1;
  const topProduct = sameUnit ? stock?.products.find((item) => item.outgoing > 0) : null;
  const maxMonthly = Math.max(1, ...(stock?.months ?? []).flatMap((item) => [item.incoming, item.outgoing]));

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Relatórios</h1>
      <p className="mt-1 text-sm text-slate-600">Movimentações e valores registrados no período. Horários de estoque: Brasília.</p>
    </div>

    <Card><CardContent className="p-5">
      <form method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_1fr_auto] xl:items-end">
        <label className="block text-sm font-medium text-slate-700">De
          <input type="date" name="start" defaultValue={start} className="mt-1 block w-full rounded-md border px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Até
          <input type="date" name="end" defaultValue={end} className="mt-1 block w-full rounded-md border px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </label>
        {stockAllowed && <label className="block text-sm font-medium text-slate-700">Produto
          <select name="product" defaultValue={chosenProduct?.id ?? ""} className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">Todos os produtos</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
          </select>
        </label>}
        {stockAllowed && <label className="block text-sm font-medium text-slate-700">Movimentação
          <select name="type" defaultValue={params.type ?? ""} className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">Todas</option><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Ajuste</option>
          </select>
        </label>}
        <button type="submit" className="rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700">Aplicar filtros</button>
      </form>
      {(filterError || invalidProduct) && <p role="alert" className="mt-3 text-sm text-red-700">{filterError ?? "Produto indisponível para esta empresa."}</p>}
    </CardContent></Card>

    {!filterError && !invalidProduct && <>
      {stock && <section aria-labelledby="stock-report" className="space-y-4">
        <div><h2 id="stock-report" className="text-xl font-semibold text-slate-900">Estoque</h2>
          <p className="text-sm text-slate-600">{formatDate(`${start}T12:00:00Z`)} a {formatDate(`${end}T12:00:00Z`)} · Ajustes são registros de saldo, não consumo.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {chosenProduct && <><Metric label="Entradas" value={`${count(stock.incoming)} ${chosenProduct.unit}`} />
            <Metric label="Saídas" value={`${count(stock.outgoing)} ${chosenProduct.unit}`} /></>}
          <Metric label="Movimentações" value={count(stock.records)} detail="Entradas, saídas e ajustes" />
          <Metric label="Dias com movimentação" value={count(stock.active_days)} />
          <Metric label="Ajustes registrados" value={count(stock.adjustments)} detail="Quantidade de registros, não unidades perdidas" />
          {!chosenProduct && <Metric label="Produtos movimentados" value={count(stock.products.length)} />}
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card><CardHeader><CardTitle>Evolução mensal</CardTitle>
            <p className="text-sm text-slate-500">Entradas e saídas do produto selecionado.</p>
          </CardHeader><CardContent>
            {!chosenProduct ? <p className="text-sm text-slate-600">Selecione um produto para ver a evolução em sua unidade de medida.</p>
              : stock.months.length === 0 ? <p className="text-sm text-slate-600">Nenhuma movimentação neste período.</p>
              : <div className="space-y-4">{stock.months.map((item) => <div key={item.month} className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
                <span className="font-medium capitalize text-slate-700">{monthLabel(item.month)}</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><span className="w-11 text-xs text-slate-500">Entrada</span><div className="h-3 min-w-0 flex-1 rounded bg-slate-100"><div className="h-3 rounded bg-emerald-500" style={{ width: `${item.incoming / maxMonthly * 100}%` }} /></div><span className="w-12 text-right tabular-nums">{count(item.incoming)}</span></div>
                  <div className="flex items-center gap-2"><span className="w-11 text-xs text-slate-500">Saída</span><div className="h-3 min-w-0 flex-1 rounded bg-slate-100"><div className="h-3 rounded bg-brand-600" style={{ width: `${item.outgoing / maxMonthly * 100}%` }} /></div><span className="w-12 text-right tabular-nums">{count(item.outgoing)}</span></div>
                </div>
              </div>)}</div>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Destaques</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-slate-700">
            {chosenProduct && (biggestMonth && biggestMonth.outgoing > 0 ? <p>Mais saídas em <strong className="capitalize">{monthLabel(biggestMonth.month)}</strong>: {count(biggestMonth.outgoing)} {chosenProduct.unit}.</p> : <p>Não houve saídas desse produto no período.</p>)}
            {!chosenProduct && topProduct && <p>Produto com mais retiradas: <strong>{topProduct.name}</strong> ({count(topProduct.outgoing)} {topProduct.unit}).</p>}
            {!chosenProduct && <p>O ranking compara quantidades dentro de cada produto; unidades de medida diferentes não devem ser somadas.</p>}
            <p>{count(stock.adjustments)} ajuste(s) de saldo. O histórico atual não permite medir perdas a partir desses registros.</p>
          </CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Produtos movimentados</CardTitle></CardHeader><CardContent>
          {stock.products.length === 0 ? <p className="text-sm text-slate-600">Nenhum produto no período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Produto</th><th className="px-3 py-3 text-right">Entradas</th><th className="px-3 py-3 text-right">Saídas</th><th className="px-3 py-3 text-right">Ajustes</th></tr></thead>
            <tbody>{stock.products.map((item) => <tr key={item.id} className="border-b last:border-b-0"><th className="px-3 py-3 font-medium text-slate-900">{item.name}<span className="ml-2 text-xs font-normal text-slate-500">{item.unit}</span></th><td className="px-3 py-3 text-right tabular-nums">{count(item.incoming)}</td><td className="px-3 py-3 text-right tabular-nums">{count(item.outgoing)}</td><td className="px-3 py-3 text-right tabular-nums">{count(item.adjustments)}</td></tr>)}</tbody>
          </table></div>}
        </CardContent></Card>
        <p className="text-sm text-slate-600">Destino, bloco e OS ainda não estão vinculados às movimentações antigas; esses recortes aparecerão quando passarem a ser registrados.</p>
      </section>}

      {financial && <section aria-labelledby="finance-report" className="space-y-4">
        <div><h2 id="finance-report" className="text-xl font-semibold text-slate-900">Financeiro realizado</h2>
          <p className="text-sm text-slate-600">Somente lançamentos pagos, agrupados pela data de pagamento. Não inclui pendências nem representa lucro contábil.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Recebido" value={money(financial.received)} />
          <Metric label="Pago" value={money(financial.paid)} />
          <Metric label="Diferença" value={money(financial.balance)} detail="Recebimentos menos pagamentos" />
          <Metric label="Lançamentos pagos" value={count(financial.records)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card><CardHeader><CardTitle>Por mês</CardTitle></CardHeader><CardContent>
            {financial.months.length === 0 ? <p className="text-sm text-slate-600">Nenhum pagamento no período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Mês</th><th className="px-3 py-3 text-right">Recebido</th><th className="px-3 py-3 text-right">Pago</th></tr></thead><tbody>{financial.months.map((item) => <tr key={item.month} className="border-b last:border-0"><th className="px-3 py-3 font-medium capitalize">{monthLabel(item.month)}</th><td className="px-3 py-3 text-right tabular-nums">{money(item.received)}</td><td className="px-3 py-3 text-right tabular-nums">{money(item.paid)}</td></tr>)}</tbody></table></div>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Por categoria</CardTitle></CardHeader><CardContent>
            {financial.categories.length === 0 ? <p className="text-sm text-slate-600">Nenhuma categoria no período.</p> : <div className="space-y-2">{financial.categories.map((item, index) => <div key={`${item.type}-${item.category}-${index}`} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0"><span>{item.category}<span className="ml-2 text-xs text-slate-500">{item.type === "INCOME" ? "Recebimento" : "Pagamento"}</span></span><strong className="tabular-nums">{money(item.total)}</strong></div>)}</div>}
          </CardContent></Card>
        </div>
        <p className="text-sm text-slate-600">As contas atuais não registram um vínculo financeiro com bloco. Não é possível afirmar gasto por bloco com esses dados.</p>
      </section>}
    </>}
  </div>;
}
