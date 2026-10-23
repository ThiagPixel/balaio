import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { can, requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_ORDER_LABELS, type ServiceOrder, type ServiceOrderStep } from "@/lib/service-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStepForm, ArchiveOrderForm, BlockerForm, CompleteOrderForm, DeleteStepForm, EditStepForm, ResolveBlockerForm, RestoreOrderForm, StartOrderForm, StartStepForm, StepForm, UpdateOrderForm } from "../order-forms";
import { OrderPhoto } from "./order-photo";
import { ManageOrderPhoto } from "./manage-photo";
import { brazilToday } from "@/lib/loans";

export const dynamic = "force-dynamic";
function StepState({ step, waiting }: { step: ServiceOrderStep; waiting: boolean }) {
  const blocked = Boolean(step.depends_on_title && !step.depends_on_completed && !step.completed_at);
  const paused = waiting && !step.completed_at && !blocked;
  const styles = step.completed_at ? "bg-emerald-50 text-emerald-700"
    : blocked ? "bg-amber-50 text-amber-800"
      : paused ? "bg-amber-50 text-amber-800"
      : step.started_at ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
    {step.completed_at ? "Concluída" : blocked ? "Bloqueada" : paused ? "Aguardando pendência" : step.started_at ? "Em andamento" : "Pendente"}
  </span>;
}
export default async function ServiceOrderPage({ params }: { params: { id: string } }) {
  const access = await requirePagePermission(PERMISSIONS.OS_VIEW);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_service_order", { p_order_id: params.id });
  if (error || !data) notFound();
  const order = data as ServiceOrder;
  const editable = !order.archived_at && order.status !== "COMPLETED";
  const { data: editPeople, error: editPeopleError } = can(access, PERMISSIONS.OS_MANAGE) && editable
    ? await supabase.rpc("list_service_order_edit_people") : { data: null, error: null };
  const people = !editPeopleError && Array.isArray(editPeople)
    ? editPeople as { id: string; full_name: string | null; email: string }[] : [];
  const { data: imagePath } = await supabase.rpc("get_service_order_image", { p_order_id: order.id });
  const { data: signedImage } = imagePath
    ? await supabase.storage.from("service-order-images").createSignedUrl(imagePath as string, 600)
    : { data: null };
  const pendingSteps = order.steps.filter((step) => !step.completed_at);
  const supportsStepProgress = order.steps.every((step) => Object.prototype.hasOwnProperty.call(step, "started_at"));
  const blockers = order.blockers.filter((blocker) => !blocker.resolved_at);
  const completedCount = order.steps.length - pendingSteps.length;
  const notStartedCount = pendingSteps.filter((step) => !step.started_at).length;
  const canComplete = !order.archived_at && can(access, PERMISSIONS.OS_COMPLETE) && access.user_id === order.principal_id
    && order.status === "IN_PROGRESS" && pendingSteps.length === 0 && blockers.length === 0;
  return <div className="space-y-5">
    <header>
      <Link href="/service-orders" className="text-sm text-brand-600">← Ordens de serviço</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">OS #{order.number} · {order.title}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{order.archived_at ? "Excluída da operação" : SERVICE_ORDER_LABELS[order.status]}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{order.location_label || "Local não informado"} · Principal: {order.principal_name}{order.due_date ? ` · Prazo: ${new Date(`${order.due_date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}</p>
    </header>
    {order.archived_at && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Esta OS foi excluída da operação em {new Date(order.archived_at).toLocaleString("pt-BR")}. O histórico permanece disponível.
      {can(access, PERMISSIONS.OS_MANAGE) && <RestoreOrderForm id={order.id} />}
    </div>}
    {can(access, PERMISSIONS.OS_MANAGE) && !order.archived_at && <div className="grid gap-3 lg:grid-cols-2">
      {editable && people.length > 0 && <UpdateOrderForm order={order} people={people} today={brazilToday()} />}
      {editable && <ManageOrderPhoto orderId={order.id} tenantId={order.tenant_id} hasPhoto={Boolean(imagePath)} />}
    </div>}

    {(order.description || imagePath) && <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">Sobre o serviço</h2>
          {order.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{order.description}</p>
            : <p className="mt-3 text-sm text-slate-500">Sem descrição adicional.</p>}
        </div>
        {signedImage?.signedUrl && <OrderPhoto src={signedImage.signedUrl} title={order.title} />}
        {imagePath && !signedImage?.signedUrl && <p className="text-sm text-slate-500">Foto indisponível no momento.</p>}
      </CardContent>
    </Card>}

    {blockers.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <h2 className="font-semibold text-amber-900">O que falta para concluir?</h2>
      {blockers.map((blocker) => <p key={blocker.id} className="mt-2 text-sm text-amber-900">{blocker.description}{blocker.responsible_name ? ` · responsável: ${blocker.responsible_name}` : ""}</p>)}
    </div>}

    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3"><CardTitle>Etapas</CardTitle><span className="text-sm text-slate-600">{completedCount} de {order.steps.length}</span></div>
          <div role="progressbar" aria-label="Etapas concluídas" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={order.steps.length} className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${order.steps.length ? completedCount / order.steps.length * 100 : 0}%` }} />
          </div>
          <p className="pt-2 text-xs text-slate-500">{notStartedCount} não iniciada{notStartedCount === 1 ? "" : "s"}{supportsStepProgress && ` · ${order.steps.filter((step) => step.started_at && !step.completed_at).length} iniciada${order.steps.filter((step) => step.started_at && !step.completed_at).length === 1 ? "" : "s"}`} · {completedCount} concluída{completedCount === 1 ? "" : "s"}</p>
        </CardHeader>
        <CardContent>
          <ol>
            {order.steps.map((step, index) => {
              const blocked = Boolean(step.depends_on_title && !step.depends_on_completed && !step.completed_at);
              const canExecute = !step.completed_at && !blocked && order.status === "IN_PROGRESS"
                && step.assignee_id === access.user_id && can(access, PERMISSIONS.OS_EXECUTE);
              return <li key={step.id} className="relative flex gap-4 pb-7 last:pb-0">
                {index < order.steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-9 w-0.5 bg-slate-200" />}
                <span aria-hidden="true" className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${step.completed_at ? "border-emerald-600 bg-emerald-50 text-emerald-700" : blocked ? "border-slate-300 bg-slate-50 text-slate-500" : "border-brand-600 bg-brand-50 text-brand-700"}`}>
                  {step.completed_at ? "✓" : step.position}
                </span>
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-5 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{step.title}</h3><StepState step={step} waiting={order.status === "WAITING"} /></div>
                  <p className="mt-1 text-xs text-slate-500">Profissional: {step.assignee_name}</p>
                  {blocked && <p className="mt-2 text-xs text-amber-700">Depende de: {step.depends_on_title}</p>}
                  {step.started_at && !step.completed_at && <p className="mt-2 text-xs text-blue-700">Iniciada em {new Date(step.started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
                  {step.completed_at && <p className="mt-2 text-xs text-emerald-700">Concluída em {new Date(step.completed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
                  {step.completion_note && <p className="mt-2 text-xs text-slate-600">{step.completion_note}</p>}
                  {!order.archived_at && canExecute && (!supportsStepProgress || step.started_at ? <StepForm id={step.id} orderId={order.id} /> : <StartStepForm id={step.id} orderId={order.id} />)}
                  {order.status === "WAITING" && !step.completed_at && !blocked && <p className="mt-2 text-xs text-amber-700">A execução fica pausada até resolver as pendências da OS.</p>}
                  {!step.completed_at && !blocked && order.status === "OPEN" && <p className="mt-2 text-xs text-slate-500">Aguardando o início da OS.</p>}
                  {!step.completed_at && !blocked && order.status === "IN_PROGRESS" && !canExecute && <p className="mt-2 text-xs text-slate-500">{step.assignee_id !== access.user_id ? `Somente ${step.assignee_name} pode executar esta etapa.` : "Você precisa da permissão de executar etapas."}</p>}
                  {!step.completed_at && !step.started_at && editable && people.length > 0 && <div className="flex flex-wrap items-start gap-2"><EditStepForm step={step} orderId={order.id} people={people} />{order.steps.length > 1 && <DeleteStepForm step={step} orderId={order.id} />}</div>}
                </div>
              </li>;
            })}
          </ol>
          {editable && people.length > 0 && order.steps.length < 20 && <AddStepForm orderId={order.id} people={people} lastPosition={order.steps.length} />}
          {pendingSteps.length > 0 && editable && <div className="mt-5 rounded-md bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-900">Próximo passo</p>
            <p className="mt-1 text-xs text-slate-600">{order.status === "OPEN" ? "Inicie a execução para trabalhar nas etapas." : blockers.length ? "Resolva as pendências e continue as etapas." : `${!supportsStepProgress || pendingSteps[0].started_at ? "Conclua" : "Inicie"} a etapa ${pendingSteps[0].position}: ${pendingSteps[0].title}.`}</p>
          </div>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle>Pendências</CardTitle><span className="text-xs text-slate-500">{blockers.length ? `${blockers.length} aberta${blockers.length === 1 ? "" : "s"}` : "Nenhuma"}</span></div></CardHeader>
          <CardContent>
            {order.blockers.length ? <div className="divide-y divide-slate-100">{order.blockers.map((blocker) => <div key={blocker.id} className="py-3 first:pt-0 text-sm"><strong>{blocker.description}</strong><p className="mt-1 text-slate-600">{blocker.responsible_name || "Responsável não informado"} · {blocker.resolved_at ? "Resolvida" : "Aguardando"}</p>{!order.archived_at && !blocker.resolved_at && can(access, PERMISSIONS.OS_RESOLVE) && <ResolveBlockerForm id={blocker.id} orderId={order.id} />}</div>)}</div>
              : <p className="text-sm text-slate-600">Não há material ou prestador aguardado.</p>}
            {editable && can(access, PERMISSIONS.OS_MANAGE) && <details className="group mt-5 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-brand-600 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">+ Registrar pendência <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">⌄</span></summary>
              <BlockerForm orderId={order.id} />
            </details>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Andamento</CardTitle></CardHeader>
          <CardContent>
            {!order.archived_at && order.status === "OPEN" && can(access, PERMISSIONS.OS_MANAGE) && <StartOrderForm id={order.id} />}
            {canComplete && <CompleteOrderForm id={order.id} />}
            {!canComplete && editable && <p className="mt-3 text-sm text-slate-600">Para concluir: todas as etapas e pendências resolvidas, com confirmação do responsável principal.</p>}
            {!order.archived_at && can(access, PERMISSIONS.OS_MANAGE) && <ArchiveOrderForm id={order.id} />}
            <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-semibold text-slate-700">Histórico</h3>{order.events.map((event) => <p key={event.id} className="mt-2 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("pt-BR")} · {event.event_type}</p>)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}
