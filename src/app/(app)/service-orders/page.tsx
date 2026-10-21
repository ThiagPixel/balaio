import Link from "next/link";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_ORDER_LABELS, type ServiceOrderStatus, type ServiceOrderSummary } from "@/lib/service-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
const tabs: { status: ServiceOrderStatus; label: string }[] = [
  { status: "WAITING", label: "Aguardando" }, { status: "IN_PROGRESS", label: "Em andamento" },
  { status: "OPEN", label: "Em aberto" }, { status: "COMPLETED", label: "Concluídas" },
];
export default async function ServiceOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const access = await requirePagePermission(PERMISSIONS.OS_VIEW);
  const status = tabs.find((tab) => tab.status === searchParams.status)?.status ?? null;
  const supabase = await createClient();
  const [{ data, error }, { data: dashboard, error: dashboardError }] = await Promise.all([
    supabase.rpc("list_service_orders", { p_status: status, p_limit: 100 }),
    supabase.rpc("get_service_order_dashboard"),
  ]);
  if (error || dashboardError) throw new Error("Não foi possível carregar as OS. Verifique as migrations 0027 e 0028.");
  const orders = data as ServiceOrderSummary[];
  const counts = dashboard as { open: number; in_progress: number; waiting: number; completed: number };
  const countFor: Record<ServiceOrderStatus, number> = { OPEN: counts.open, IN_PROGRESS: counts.in_progress, WAITING: counts.waiting, COMPLETED: counts.completed };
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ordens de serviço</h1><p className="mt-1 text-sm text-slate-500">Execução, pendências e conclusão dos serviços</p></div>{can(access, PERMISSIONS.OS_CREATE) && <Link href="/service-orders/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">+ Abrir OS</Link>}</div>
    <div className="grid gap-3 sm:grid-cols-4">{tabs.map((tab) => <Card key={tab.status}><CardContent className="p-4"><p className="text-sm text-slate-600">{tab.label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{countFor[tab.status]}</p></CardContent></Card>)}</div>
    <nav aria-label="Situação das OS" className="flex flex-wrap gap-1 border-b border-slate-200"><Link href="/service-orders" aria-current={status === null ? "page" : undefined} className={`border-b-2 px-4 py-3 text-sm font-medium ${status === null ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600"}`}>Prioridades</Link>{tabs.map((tab) => <Link key={tab.status} href={`/service-orders?status=${tab.status}`} aria-current={status === tab.status ? "page" : undefined} className={`border-b-2 px-4 py-3 text-sm font-medium ${status === tab.status ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600"}`}>{tab.label}</Link>)}</nav>
    <Card><CardHeader><CardTitle>{status ? SERVICE_ORDER_LABELS[status] : "Prioridades"}</CardTitle></CardHeader><CardContent>{orders.length ? <div className="divide-y divide-slate-100">{orders.map((order) => <div key={order.id} className="grid gap-2 py-4 text-sm sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center"><div><strong>#{order.number} · {order.title}</strong><p className="mt-1 text-xs text-slate-500">{order.priority === "HIGH" ? "Prioridade alta" : order.priority === "LOW" ? "Prioridade baixa" : "Prioridade normal"}</p></div><div><p>{order.location_label || "Local não informado"}</p><p className="text-xs text-slate-500">Principal: {order.principal_name}</p></div><div>{order.waiting_for ? <span className="text-amber-700">Aguardando: {order.waiting_for}</span> : SERVICE_ORDER_LABELS[order.status]}{order.due_date && <p className="text-xs text-slate-500">Prazo: {new Date(`${order.due_date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>}</div><Link href={`/service-orders/${order.id}`} className="font-medium text-brand-600">Ver OS →</Link></div>)}</div> : <p className="text-sm text-slate-600">Nenhuma OS nesta situação.</p>}{orders.length === 100 && <p className="mt-4 text-xs text-slate-500">Exibindo as primeiras 100 OS.</p>}</CardContent></Card>
  </div>;
}
