import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_ORDER_LABELS, type ServiceOrder } from "@/lib/service-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockerForm, CompleteOrderForm, ResolveBlockerForm, StartOrderForm, StepForm } from "../order-forms";

export const dynamic = "force-dynamic";
export default async function ServiceOrderPage({ params }: { params: { id: string } }) {
  const access = await requirePagePermission(PERMISSIONS.OS_VIEW);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_service_order", { p_order_id: params.id });
  if (error || !data) notFound();
  const order = data as ServiceOrder;
  const pendingSteps = order.steps.filter((step) => !step.completed_at);
  const blockers = order.blockers.filter((blocker) => !blocker.resolved_at);
  const canComplete = can(access, PERMISSIONS.OS_COMPLETE) && access.user_id === order.principal_id
    && order.status === "IN_PROGRESS" && pendingSteps.length === 0 && blockers.length === 0;
  return <div className="space-y-6"><div><Link href="/service-orders" className="text-sm text-brand-600">← Ordens de serviço</Link><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">OS #{order.number} · {order.title}</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{SERVICE_ORDER_LABELS[order.status]}</span></div><p className="mt-2 text-sm text-slate-600">{order.location_label || "Local não informado"} · Principal: {order.principal_name}{order.due_date ? ` · Prazo: ${new Date(`${order.due_date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}</p>{order.description && <p className="mt-3 text-sm text-slate-700">{order.description}</p>}</div>
    {blockers.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">O que falta para concluir?</h2>{blockers.map((blocker) => <p key={blocker.id} className="mt-2 text-sm text-amber-900">{blocker.description}{blocker.responsible_name ? ` · responsável: ${blocker.responsible_name}` : ""}</p>)}</div>}
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><Card><CardHeader><CardTitle>Etapas</CardTitle></CardHeader><CardContent><div className="divide-y divide-slate-100">{order.steps.map((step) => <div key={step.id} className="py-4"><div className="flex justify-between gap-2"><strong className="text-sm">{step.position}. {step.title}</strong><span className={`text-sm ${step.completed_at ? "text-emerald-700" : "text-slate-600"}`}>{step.completed_at ? "Concluída" : step.depends_on_title && !step.depends_on_completed ? "Bloqueada" : "Pendente"}</span></div><p className="mt-1 text-xs text-slate-500">Profissional: {step.assignee_name}</p>{step.depends_on_title && <p className="mt-1 text-xs text-amber-700">Depende de: {step.depends_on_title}</p>}{step.completion_note && <p className="mt-1 text-xs text-slate-600">{step.completion_note}</p>}{!step.completed_at && (!step.depends_on_title || step.depends_on_completed) && ["IN_PROGRESS", "WAITING"].includes(order.status) && step.assignee_id === access.user_id && can(access, PERMISSIONS.OS_EXECUTE) && <StepForm id={step.id} orderId={order.id} />}</div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Pendências</CardTitle></CardHeader><CardContent>{order.blockers.length ? <div className="divide-y divide-slate-100">{order.blockers.map((blocker) => <div key={blocker.id} className="py-3 text-sm"><strong>{blocker.description}</strong><p className="mt-1 text-slate-600">{blocker.responsible_name || "Responsável não informado"} · {blocker.resolved_at ? "Resolvida" : "Aguardando"}</p>{!blocker.resolved_at && can(access, PERMISSIONS.OS_RESOLVE) && <ResolveBlockerForm id={blocker.id} orderId={order.id} />}</div>)}</div> : <p className="text-sm text-slate-600">Nenhuma pendência registrada.</p>}{order.status !== "COMPLETED" && can(access, PERMISSIONS.OS_MANAGE) && <BlockerForm orderId={order.id} />}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Andamento</CardTitle></CardHeader><CardContent><div className="flex flex-wrap items-center gap-4">{order.status === "OPEN" && can(access, PERMISSIONS.OS_MANAGE) && <StartOrderForm id={order.id} />}{canComplete && <CompleteOrderForm id={order.id} />}{!canComplete && order.status !== "COMPLETED" && <p className="text-sm text-slate-600">A conclusão exige todas as etapas e pendências resolvidas e a confirmação do responsável principal.</p>}</div><div className="mt-5 divide-y divide-slate-100">{order.events.map((event) => <p key={event.id} className="py-2 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("pt-BR")} · {event.event_type}</p>)}</div></CardContent></Card>
  </div>;
}
