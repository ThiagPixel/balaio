"use client";
/* eslint-disable @next/next/no-img-element -- Prévia local de um Blob já comprimido. */

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addServiceOrderBlocker, addServiceOrderStep, archiveServiceOrder, completeServiceOrder, completeServiceOrderStep,
  createServiceOrder, deleteServiceOrderStep, resolveServiceOrderBlocker, restoreServiceOrder, startServiceOrder, startServiceOrderStep,
  updateServiceOrder, updateServiceOrderStep, type OsState } from "@/app/actions/service-orders";
import { SubmitButton } from "@/components/ui/submit-button";
import { brazilToday } from "@/lib/loans";
import { BrazilDatePicker } from "@/components/ui/brazil-date-picker";
import type { ServiceOrder, ServiceOrderStep } from "@/lib/service-orders";
import { createClient } from "@/lib/supabase/client";
import { prepareServiceOrderImage } from "@/lib/service-order-image";

const input = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const label = "block text-sm font-medium text-slate-700";
type Person = { id: string; full_name: string | null; email: string };
function Feedback({ state }: { state: OsState }) { return state?.error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null; }
function PeopleOptions({ people }: { people: Person[] }) { return <>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</>; }

export function CreateOrderForm({ people, today }: { people: Person[]; today: string }) {
  const [state, action] = useFormState(createServiceOrder, null);
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "preparing" | "uploading" | "failed">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRequest = useRef(0);
  const attemptedOrder = useRef<string | null>(null);
  const [minDate, setMinDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [steps, setSteps] = useState([{ title: "", assignee_id: people[0]?.id ?? "", depends_on_previous: false }]);
  useEffect(() => {
    const refreshToday = () => {
      const current = brazilToday();
      setMinDate(current);
      setDueDate((selected) => selected < current ? current : selected);
    };
    refreshToday();
    const timer = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function selectPhoto(file?: File) {
    const request = ++photoRequest.current;
    setPhoto(null);
    setPreviewUrl(null);
    setPhotoError(null);
    if (!file) { setPhotoStatus("idle"); return; }
    setPhotoStatus("preparing");
    try {
      const prepared = await prepareServiceOrderImage(file);
      if (request !== photoRequest.current) return;
      setPhoto(prepared);
      setPreviewUrl(URL.createObjectURL(prepared));
      setPhotoStatus("idle");
    } catch (error) {
      if (request !== photoRequest.current) return;
      setPhotoError(error instanceof Error ? error.message : "Não foi possível preparar a foto.");
      setPhotoStatus("idle");
    }
  }

  async function uploadPhoto(orderId: string, tenantId: string, image: File) {
    setPhotoStatus("uploading");
    setPhotoError(null);
    const supabase = createClient();
    const path = `${tenantId}/${orderId}/${crypto.randomUUID()}.${image.type === "image/webp" ? "webp" : "jpg"}`;
    try {
      const { error: uploadError } = await supabase.storage.from("service-order-images")
        .upload(path, image, { contentType: image.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: attachError } = await supabase.rpc("attach_service_order_image", {
        p_order_id: orderId, p_object_path: path,
      });
      if (attachError) {
        await supabase.storage.from("service-order-images").remove([path]);
        throw attachError;
      }
      router.replace(`/service-orders/${orderId}`);
    } catch {
      // Se o envio terminou no Storage mas a confirmação falhou, tenta retirar o órfão.
      await supabase.storage.from("service-order-images").remove([path]);
      setPhotoStatus("failed");
      setPhotoError("A OS foi criada, mas a foto não foi enviada. Tente novamente ou abra a OS sem foto.");
    }
  }

  useEffect(() => {
    if (!state?.orderId || !state.tenantId || attemptedOrder.current === state.orderId) return;
    attemptedOrder.current = state.orderId;
    if (photo) void uploadPhoto(state.orderId, state.tenantId, photo);
    else router.replace(`/service-orders/${state.orderId}`);
    // A foto escolhida no envio deve permanecer fixa durante o processamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.orderId, state?.tenantId]);

  return <form action={action} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <Feedback state={state} />
    <label className={label}>Serviço<input className={input} name="title" minLength={3} maxLength={160} required placeholder="Instalar câmera" /></label>
    <label className={label}>Descrição<textarea className={input} name="description" maxLength={2000} rows={3} placeholder="O que precisa ser feito?" /></label>
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <label className={label} htmlFor="service-order-photo">Foto do serviço (opcional)</label>
      <p className="mt-1 text-xs font-normal text-slate-500">JPG, PNG ou WebP. A foto será reduzida antes do envio; apenas uma por OS.</p>
      <input id="service-order-photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700" disabled={Boolean(state?.orderId) || photoStatus === "uploading"} onChange={(event) => void selectPhoto(event.target.files?.[0])} />
      {photoStatus === "preparing" && <p role="status" className="mt-2 text-sm text-slate-600">Preparando foto...</p>}
      {previewUrl && <div className="mt-3 flex flex-wrap items-start gap-3"><img src={previewUrl} alt="Prévia da foto escolhida para a OS" className="max-h-48 max-w-full rounded-md border border-slate-200 object-contain" /><span className="text-xs text-slate-600">Foto pronta · {Math.ceil((photo?.size ?? 0) / 1024)} KB</span></div>}
      {photoError && <p role="alert" className="mt-2 text-sm text-red-700">{photoError}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Local<input className={input} name="location" maxLength={160} placeholder="Bloco 2 · sala 204" /><span className="mt-1 block text-xs font-normal text-slate-500">Texto de referência; ainda não gera relatório confiável por bloco.</span></label>
      <div><span className={label}>Prazo</span><BrazilDatePicker value={dueDate} min={minDate} onChange={setDueDate} /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Prioridade<select className={input} name="priority" defaultValue="NORMAL"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option></select></label>
      <label className={label}>Responsável principal<select className={input} name="principal_id" required defaultValue=""><option value="" disabled>Selecione</option><PeopleOptions people={people} /></select></label></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Etapas obrigatórias</h2><button type="button" className="text-sm font-medium text-brand-600 disabled:opacity-50" disabled={steps.length >= 20} onClick={() => setSteps([...steps, { title: "", assignee_id: people[0]?.id ?? "", depends_on_previous: false }])}>+ Adicionar etapa</button></div>
      {steps.map((step, index) => <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><label className={label}>Etapa {index + 1}<input className={input} value={step.title} minLength={3} maxLength={160} required placeholder="Instalar tomada" onChange={(event) => setSteps(steps.map((s, i) => i === index ? { ...s, title: event.target.value } : s))} /></label>
        <label className={label}>Profissional<select className={input} value={step.assignee_id} onChange={(event) => setSteps(steps.map((s, i) => i === index ? { ...s, assignee_id: event.target.value } : s))}><PeopleOptions people={people} /></select></label>
        <button type="button" className="pb-2 text-sm text-red-600 disabled:opacity-40" disabled={steps.length === 1} onClick={() => setSteps(steps.filter((_, i) => i !== index))}>Remover</button>{index > 0 && <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-3"><input type="checkbox" checked={step.depends_on_previous} onChange={(event) => setSteps(steps.map((s, i) => i === index ? { ...s, depends_on_previous: event.target.checked } : s))} />Só iniciar após concluir a etapa anterior</label>}</div>)}
    </div>
    <input type="hidden" name="steps" value={JSON.stringify(steps)} />
    {state?.orderId && photoStatus === "failed" && <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => { if (state.tenantId && photo) void uploadPhoto(state.orderId!, state.tenantId, photo); }} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">Tentar enviar foto novamente</button><Link href={`/service-orders/${state.orderId}`} className="text-sm font-medium text-brand-600">Abrir OS sem foto →</Link></div>}
    {photoStatus === "uploading" && <p role="status" className="text-sm text-slate-600">OS criada. Enviando foto...</p>}
    <SubmitButton disabled={photoStatus === "preparing" || photoStatus === "uploading" || Boolean(state?.orderId)} pendingLabel="Abrindo OS...">Abrir OS</SubmitButton>
  </form>;
}

export function StartOrderForm({ id }: { id: string }) {
  const [state, action] = useFormState(startServiceOrder, null);
  return <form action={action} className="space-y-2"><Feedback state={state} /><input type="hidden" name="order_id" value={id} /><SubmitButton pendingLabel="Iniciando...">Iniciar execução</SubmitButton></form>;
}
export function StepForm({ id, orderId }: { id: string; orderId: string }) {
  const [state, action] = useFormState(completeServiceOrderStep, null);
  return <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"><Feedback state={state} /><input type="hidden" name="step_id" value={id} /><input type="hidden" name="order_id" value={orderId} /><label className={label}>Observação (opcional)<input className={input} name="note" maxLength={1000} placeholder="O que foi feito?" /></label><SubmitButton pendingLabel="Confirmando..." size="sm">Concluir etapa</SubmitButton></form>;
}
export function StartStepForm({ id, orderId }: { id: string; orderId: string }) {
  const [state, action] = useFormState(startServiceOrderStep, null);
  return <form action={action} className="mt-3 space-y-2"><Feedback state={state} /><input type="hidden" name="step_id" value={id} /><input type="hidden" name="order_id" value={orderId} /><SubmitButton pendingLabel="Iniciando etapa..." size="sm">Iniciar etapa</SubmitButton></form>;
}
export function EditStepForm({ step, orderId, people }: { step: ServiceOrderStep; orderId: string; people: Person[] }) {
  const [state, action] = useFormState(updateServiceOrderStep, null);
  return <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
    <summary className="cursor-pointer text-sm font-medium text-brand-600">Editar etapa</summary>
    <form action={action} className="mt-3 space-y-3"><Feedback state={state} />
      <input type="hidden" name="step_id" value={step.id} /><input type="hidden" name="order_id" value={orderId} />
      <label className={label}>Nome da etapa<input className={input} name="title" defaultValue={step.title} minLength={3} maxLength={160} required /></label>
      <label className={label}>Profissional<select className={input} name="assignee_id" defaultValue={step.assignee_id} required><PeopleOptions people={people} /></select></label>
      {step.position > 1 && <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="depends_on_previous" defaultChecked={Boolean(step.depends_on_title)} />Depende da etapa anterior</label>}
      <p className="text-xs text-slate-500">Só é possível editar antes de iniciar a etapa. A alteração fica no histórico da OS.</p>
      <SubmitButton pendingLabel="Salvando etapa..." size="sm" variant="outline">Salvar etapa</SubmitButton>
    </form>
  </details>;
}
export function UpdateOrderForm({ order, people, today }: { order: ServiceOrder; people: Person[]; today: string }) {
  const [state, action] = useFormState(updateServiceOrder, null);
  const [dueDate, setDueDate] = useState(order.due_date || today);
  return <details className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <summary className="cursor-pointer text-sm font-medium text-brand-600">Editar dados da OS</summary>
    <form action={action} className="mt-4 space-y-4"><Feedback state={state} />
      <input type="hidden" name="order_id" value={order.id} />
      <label className={label}>Serviço<input className={input} name="title" defaultValue={order.title} minLength={3} maxLength={160} required /></label>
      <label className={label}>Descrição<textarea className={input} name="description" defaultValue={order.description || ""} maxLength={2000} rows={3} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Local<input className={input} name="location" defaultValue={order.location_label || ""} maxLength={160} /></label>
        <div><span className={label}>Prazo</span><BrazilDatePicker value={dueDate} min={today} onChange={setDueDate} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Prioridade<select className={input} name="priority" defaultValue={order.priority}><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option></select></label>
        <label className={label}>Responsável principal<select className={input} name="principal_id" defaultValue={order.principal_id} required><PeopleOptions people={people} /></select></label></div>
      <p className="text-xs text-slate-500">A alteração de dados fica registrada no histórico.</p>
      <SubmitButton pendingLabel="Salvando OS..." size="sm">Salvar alterações</SubmitButton>
    </form>
  </details>;
}
export function AddStepForm({ orderId, people, lastPosition }: { orderId: string; people: Person[]; lastPosition: number }) {
  const [state, action] = useFormState(addServiceOrderStep, null);
  return <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
    <summary className="cursor-pointer text-sm font-medium text-brand-600">+ Adicionar etapa</summary>
    <form action={action} className="mt-3 space-y-3"><Feedback state={state} /><input type="hidden" name="order_id" value={orderId} />
      <label className={label}>Nome da etapa<input className={input} name="title" minLength={3} maxLength={160} required placeholder="Ex.: instalar lâmpada" /></label>
      <label className={label}>Profissional<select className={input} name="assignee_id" defaultValue="" required><option value="" disabled>Selecione</option><PeopleOptions people={people} /></select></label>
      {lastPosition > 0 && <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="depends_on_previous" />Depende da etapa anterior</label>}
      <SubmitButton pendingLabel="Adicionando etapa..." size="sm" variant="outline">Adicionar etapa</SubmitButton>
    </form>
  </details>;
}
export function DeleteStepForm({ step, orderId }: { step: ServiceOrderStep; orderId: string }) {
  const [state, action] = useFormState(deleteServiceOrderStep, null);
  return <form action={action} onSubmit={(event) => { if (!window.confirm(`Excluir a etapa “${step.title}”? Etapas dependentes ficarão sem essa dependência.`)) event.preventDefault(); }} className="mt-2">
    <Feedback state={state} /><input type="hidden" name="step_id" value={step.id} /><input type="hidden" name="order_id" value={orderId} />
    <SubmitButton size="sm" variant="outline" pendingLabel="Excluindo etapa...">Excluir etapa</SubmitButton>
  </form>;
}
export function ArchiveOrderForm({ id }: { id: string }) {
  const [state, action] = useFormState(archiveServiceOrder, null);
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Excluir esta OS da operação? Ela sairá das listas e do dashboard, mas poderá ser restaurada em Excluídas.")) event.preventDefault(); }} className="mt-5 border-t border-slate-100 pt-4">
    <Feedback state={state} /><input type="hidden" name="order_id" value={id} />
    <SubmitButton size="sm" variant="outline" pendingLabel="Excluindo OS...">Excluir OS</SubmitButton>
    <p className="mt-2 text-xs text-slate-500">O histórico, as etapas e a foto serão preservados.</p>
  </form>;
}
export function RestoreOrderForm({ id }: { id: string }) {
  const [state, action] = useFormState(restoreServiceOrder, null);
  return <form action={action} className="mt-3"><Feedback state={state} /><input type="hidden" name="order_id" value={id} />
    <SubmitButton size="sm" variant="outline" pendingLabel="Restaurando OS...">Restaurar OS</SubmitButton>
  </form>;
}
export function BlockerForm({ orderId }: { orderId: string }) {
  const [state, action] = useFormState(addServiceOrderBlocker, null);
  return <form action={action} className="mt-4 space-y-3 rounded-md bg-slate-50 p-4"><Feedback state={state} /><input type="hidden" name="order_id" value={orderId} />
    <h3 className="font-medium">Registrar pendência</h3><label className={label}>Tipo<select className={input} name="kind"><option value="MATERIAL">Material</option><option value="EXTERNAL">Prestador / outro técnico</option><option value="OTHER">Outra</option></select></label>
    <label className={label}>O que falta?<input className={input} name="description" minLength={3} maxLength={500} required placeholder="Instalar tomada" /></label>
    <label className={label}>Quem deve agir?<input className={input} name="responsible" maxLength={120} placeholder="Nome ou empresa" /></label>
    <SubmitButton pendingLabel="Registrando..." variant="outline">Registrar pendência</SubmitButton></form>;
}
export function ResolveBlockerForm({ id, orderId }: { id: string; orderId: string }) {
  const [state, action] = useFormState(resolveServiceOrderBlocker, null);
  return <form action={action} className="mt-2 space-y-2"><Feedback state={state} /><input type="hidden" name="blocker_id" value={id} /><input type="hidden" name="order_id" value={orderId} /><label className={label}>Confirmação<input className={input} name="note" maxLength={1000} placeholder="Ex.: material recebido e conferido" /></label><SubmitButton pendingLabel="Confirmando..." size="sm" variant="outline">Confirmar atendimento</SubmitButton></form>;
}
export function CompleteOrderForm({ id }: { id: string }) {
  const [state, action] = useFormState(completeServiceOrder, null);
  return <form action={action} className="space-y-2"><Feedback state={state} /><input type="hidden" name="order_id" value={id} /><SubmitButton pendingLabel="Concluindo...">Concluir OS</SubmitButton></form>;
}
