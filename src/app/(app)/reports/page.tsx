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
const sentenceCase = (value: string) => {
  const lower = value.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
};
const signed = (value: number) => `${value > 0 ? "+" : ""}${count(value)}`;
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

type MetricIcon = "in" | "out" | "records" | "days" | "adjust" | "products";
function Icon({ kind }: { kind: MetricIcon }) {
  const paths: Record<MetricIcon, React.ReactNode> = {
    in: <><path d="M12 19V5m0 0-5 5m5-5 5 5" /><path d="M4 19h16" /></>,
    out: <><path d="M12 5v14m0 0-5-5m5 5 5-5" /><path d="M4 5h16" /></>,
    records: <><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    days: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    adjust: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" /></>,
    products: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10" /></>,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function Metric({ label, value, detail, icon, tone = "blue" }: { label: string; value: string; detail?: string; icon: MetricIcon; tone?: "blue" | "green" | "red" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-red-50 text-red-600" : "bg-blue-50 text-brand-700";
  const valueClass = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-slate-950";
  return <Card className="min-w-0 rounded-xl"><CardContent className="flex items-center gap-4 p-4 sm:p-5">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClass}`}><Icon kind={icon} /></span>
    <div className="min-w-0"><p className="text-sm text-slate-600">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
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
  let currentStock: number | null = null;
  let financial: FinancialReport | null = null;

  if (stockAllowed) {
    const result = await supabase.rpc("list_report_products");
    if (result.error) throw new Error("Não foi possível carregar os produtos do relatório.");
    products = (result.data ?? []) as ProductOption[];
  }
  const chosenProduct = products.find((item) => item.id === params.product);
  const invalidProduct = Boolean(params.product && stockAllowed && !chosenProduct);

  if (!filterError && !invalidProduct) {
    const [stockResult, financeResult, currentStockResult] = await Promise.all([
      stockAllowed ? supabase.rpc("get_stock_report", {
        p_start: start, p_end: end, p_product_id: chosenProduct?.id ?? null,
        p_type: params.type || null,
      }) : Promise.resolve(null),
      financeAllowed ? supabase.rpc("get_financial_report", {
        p_start: start, p_end: end,
      }) : Promise.resolve(null),
      chosenProduct ? supabase.rpc("get_report_product_current_stock", {
        p_product_id: chosenProduct.id,
      }) : Promise.resolve(null),
    ]);
    if (stockResult?.error || financeResult?.error || currentStockResult?.error) {
      console.error("Erro ao carregar relatório", {
        stock: stockResult?.error?.code, finance: financeResult?.error?.code,
        currentStock: currentStockResult?.error?.code,
      });
      throw new Error("Não foi possível carregar o relatório. Verifique se as migrations 0024 e 0026 foram aplicadas.");
    }
    stock = stockResult?.data as StockReport | null;
    financial = financeResult?.data as FinancialReport | null;
    currentStock = currentStockResult ? Number(currentStockResult.data) : null;
  }

  const biggestMonth = stock?.months.reduce<Month | null>((best, current) =>
    !best || current.outgoing > best.outgoing ? current : best, null);
  const biggestIncomingMonth = stock?.months.reduce<Month | null>((best, current) =>
    !best || current.incoming > best.incoming ? current : best, null);
  const sameUnit = stock && new Set(stock.products.map((item) => item.unit)).size === 1;
  const topProduct = sameUnit ? stock?.products.find((item) => item.outgoing > 0) : null;
  const maxMonthly = Math.max(1, ...(stock?.months ?? []).flatMap((item) => [item.incoming, item.outgoing]));
  const chartHeight = 210;

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
            {products.map((item) => <option key={item.id} value={item.id}>{sentenceCase(item.name)} ({item.unit})</option>)}
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
      {stock && <section aria-labelledby="stock-report" className="space-y-5">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Relatório de estoque</p>
          <h2 id="stock-report" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{chosenProduct ? `Movimentação de ${sentenceCase(chosenProduct.name)}` : "Visão geral das movimentações"}</h2>
          <p className="mt-1 text-sm text-slate-600">Período analisado: {formatDate(`${start}T12:00:00Z`)} a {formatDate(`${end}T12:00:00Z`)}{chosenProduct && <> · {count(stock.active_days)} dias com movimentação · {count(stock.adjustments)} ajustes de saldo</>}</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {chosenProduct && <><Metric label="Entradas" value={`${count(stock.incoming)} ${chosenProduct.unit}`} icon="in" tone="green" />
            <Metric label="Retiradas" value={`${count(stock.outgoing)} ${chosenProduct.unit}`} icon="out" tone="red" />
            <Metric label="Diferença no período" value={`${signed(stock.incoming - stock.outgoing)} ${chosenProduct.unit}`} icon="adjust" detail="Entradas − retiradas; não é saldo atual" />
            {currentStock !== null && <Metric label="Em estoque agora" value={`${count(currentStock)} ${chosenProduct.unit}`} icon="products" detail="Saldo atual do cadastro" />}</>}
          <Metric label="Registros" value={count(stock.records)} icon="records" detail="Entradas, saídas e ajustes" />
          {!chosenProduct && <Metric label="Dias com movimentação" value={count(stock.active_days)} icon="days" />}
          {!chosenProduct && <Metric label="Ajustes de saldo" value={count(stock.adjustments)} icon="adjust" tone="red" detail="Número de registros" />}
          {!chosenProduct && <Metric label="Produtos movimentados" value={count(stock.products.length)} icon="products" />}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
          <Card className="rounded-xl"><CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div><CardTitle className="text-xl">Movimentação mensal</CardTitle><p className="mt-2 text-sm text-slate-500">Entradas e retiradas por mês{chosenProduct ? ` · ${chosenProduct.unit}` : ""}</p></div>
            {chosenProduct && <div className="flex gap-4 text-xs text-slate-600"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Entradas</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Retiradas</span></div>}
          </CardHeader><CardContent>
            {!chosenProduct ? <p className="py-12 text-center text-sm text-slate-600">Selecione um produto para comparar quantidades na mesma unidade de medida.</p>
              : stock.months.length === 0 ? <p className="py-12 text-center text-sm text-slate-600">Nenhuma movimentação neste período.</p>
              : <div className="overflow-x-auto pb-1"><div style={{ minWidth: Math.max(480, stock.months.length * 76) }}>
                <div className="relative pl-10 pt-7">
                  <div className="pointer-events-none absolute bottom-0 left-10 right-0 top-7 flex flex-col justify-between border-b border-slate-300">{[4, 3, 2, 1, 0].map((step) => <div key={step} className="relative border-t border-slate-100"><span className="absolute -left-10 -top-2.5 w-8 text-right text-xs tabular-nums text-slate-500">{count(Math.ceil(maxMonthly * step / 4))}</span></div>)}</div>
                  <div className="relative z-10 flex items-end gap-4 px-3" style={{ height: chartHeight }}>
                    {stock.months.map((item) => <div key={item.month} className="flex h-full min-w-12 flex-1 items-end justify-center gap-1.5" aria-label={`${monthLabel(item.month)}: ${count(item.incoming)} entradas e ${count(item.outgoing)} retiradas`}>
                      <div className="group relative w-full max-w-12 rounded-t bg-emerald-500/90" style={{ height: `${item.incoming / maxMonthly * 100}%` }} title={`${count(item.incoming)} entradas`}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold tabular-nums text-emerald-700">{item.incoming > 0 ? count(item.incoming) : ""}</span></div>
                      <div className="group relative w-full max-w-12 rounded-t bg-red-500" style={{ height: `${item.outgoing / maxMonthly * 100}%` }} title={`${count(item.outgoing)} retiradas`}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold tabular-nums text-red-600">{item.outgoing > 0 ? count(item.outgoing) : ""}</span></div>
                    </div>)}
                  </div>
                </div>
                <div className="flex gap-4 pl-10 pr-3 pt-3">{stock.months.map((item) => <span key={item.month} className="min-w-12 flex-1 text-center text-xs font-medium capitalize text-slate-600">{monthLabel(item.month)}</span>)}</div>
              </div></div>}
          </CardContent></Card>
          <Card className="rounded-xl"><CardHeader><CardTitle className="text-xl">Destaques</CardTitle></CardHeader><CardContent className="space-y-5 text-sm text-slate-700">
            {chosenProduct && <><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon kind="out" /></span><p>{biggestMonth && biggestMonth.outgoing > 0 ? <>Mais retiradas em <strong className="capitalize">{monthLabel(biggestMonth.month)}</strong>: <strong>{count(biggestMonth.outgoing)} {chosenProduct.unit}</strong>.</> : "Não houve retiradas desse produto no período."}</p></div>
              <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon kind="in" /></span><p>{biggestIncomingMonth && biggestIncomingMonth.incoming > 0 ? <>Mais entradas em <strong className="capitalize">{monthLabel(biggestIncomingMonth.month)}</strong>: <strong>{count(biggestIncomingMonth.incoming)} {chosenProduct.unit}</strong>.</> : "Não houve entradas desse produto no período."}</p></div></>}
            {!chosenProduct && topProduct && <p>Produto com mais retiradas entre os de mesma unidade: <strong>{sentenceCase(topProduct.name)}</strong> ({count(topProduct.outgoing)} {topProduct.unit}).</p>}
            {!chosenProduct && <p>Selecione um produto para ver o gráfico e os destaques mensais.</p>}
            {chosenProduct && <p>A diferença no período foi de <strong>{signed(stock.incoming - stock.outgoing)} {chosenProduct.unit}</strong>. O saldo atual também considera estoque anterior e ajustes.</p>}
            <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Icon kind="adjust" /></span><p><strong>{count(stock.adjustments)}</strong> ajuste(s) de saldo. Esses registros não indicam, por si só, quantas unidades foram perdidas.</p></div>
          </CardContent></Card>
        </div>

        {chosenProduct && <Card className="rounded-xl"><CardHeader><CardTitle className="text-xl">Resumo mensal</CardTitle></CardHeader><CardContent>
          {stock.months.length === 0 ? <p className="text-sm text-slate-600">Nenhuma movimentação neste período.</p> : <div className="divide-y divide-slate-100">{stock.months.map((item) => <div key={item.month} className="grid gap-2 py-3 text-sm sm:grid-cols-4 sm:items-center">
            <strong className="capitalize text-slate-900">{monthLabel(item.month)}</strong><span className="font-medium tabular-nums text-emerald-700">{count(item.incoming)} entradas</span><span className="font-medium tabular-nums text-red-600">{count(item.outgoing)} retiradas</span><span className={`tabular-nums ${item.incoming - item.outgoing < 0 ? "text-red-600" : "text-slate-700"}`}>{signed(item.incoming - item.outgoing)} {chosenProduct.unit}</span>
          </div>)}</div>}
          <p className="mt-3 text-xs text-slate-500">Diferença = entradas − retiradas. Ajustes de saldo não entram nessa conta.</p>
        </CardContent></Card>}

        <Card className="rounded-xl"><CardHeader><CardTitle>Produtos movimentados</CardTitle></CardHeader><CardContent>
          {stock.products.length === 0 ? <p className="text-sm text-slate-600">Nenhum produto no período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Produto</th><th className="px-3 py-3 text-right">Entradas</th><th className="px-3 py-3 text-right">Saídas</th><th className="px-3 py-3 text-right">Ajustes</th></tr></thead>
            <tbody>{stock.products.map((item) => <tr key={item.id} className="border-b last:border-b-0"><th className="px-3 py-3 font-medium text-slate-900">{sentenceCase(item.name)}<span className="ml-2 text-xs font-normal text-slate-500">{item.unit}</span></th><td className="px-3 py-3 text-right tabular-nums text-emerald-700">{count(item.incoming)}</td><td className="px-3 py-3 text-right tabular-nums text-red-600">{count(item.outgoing)}</td><td className="px-3 py-3 text-right tabular-nums">{count(item.adjustments)}</td></tr>)}</tbody>
          </table></div>}
        </CardContent></Card>
        <p className="text-sm text-slate-600">Destino, bloco e OS ainda não estão vinculados às movimentações antigas; esses recortes aparecerão quando passarem a ser registrados.</p>
      </section>}

      {financial && <section aria-labelledby="finance-report" className="space-y-4">
        <div><h2 id="finance-report" className="text-xl font-semibold text-slate-900">Financeiro realizado</h2>
          <p className="text-sm text-slate-600">Somente lançamentos pagos, agrupados pela data de pagamento. Não inclui pendências nem representa lucro contábil.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Recebido" value={money(financial.received)} icon="in" tone="green" />
          <Metric label="Pago" value={money(financial.paid)} icon="out" tone="red" />
          <Metric label="Diferença" value={money(financial.balance)} detail="Recebimentos menos pagamentos" icon="adjust" />
          <Metric label="Lançamentos pagos" value={count(financial.records)} icon="records" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card><CardHeader><CardTitle>Por mês</CardTitle></CardHeader><CardContent>
            {financial.months.length === 0 ? <p className="text-sm text-slate-600">Nenhum pagamento no período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Mês</th><th className="px-3 py-3 text-right">Recebido</th><th className="px-3 py-3 text-right">Pago</th></tr></thead><tbody>{financial.months.map((item) => <tr key={item.month} className="border-b last:border-0"><th className="px-3 py-3 font-medium capitalize">{monthLabel(item.month)}</th><td className="px-3 py-3 text-right tabular-nums text-emerald-700">{money(item.received)}</td><td className="px-3 py-3 text-right tabular-nums text-red-600">{money(item.paid)}</td></tr>)}</tbody></table></div>}
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
