"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { addServiceOrderBlocker, completeServiceOrder, completeServiceOrderStep,
  createServiceOrder, resolveServiceOrderBlocker, startServiceOrder, type OsState } from "@/app/actions/service-orders";
import { SubmitButton } from "@/components/ui/submit-button";
import { brazilToday } from "@/lib/loans";
import { BrazilDatePicker } from "@/components/ui/brazil-date-picker";

const input = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const label = "block text-sm font-medium text-slate-700";
type Person = { id: string; full_name: string | null; email: string };
function Feedback({ state }: { state: OsState }) { return state?.error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null; }
function PeopleOptions({ people }: { people: Person[] }) { return <>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</>; }

export function CreateOrderForm({ people, today }: { people: Person[]; today: string }) {
  const [state, action] = useFormState(createServiceOrder, null);
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
  return <form action={action} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <Feedback state={state} />
    <label className={label}>Serviço<input className={input} name="title" minLength={3} maxLength={160} required placeholder="Instalar câmera" /></label>
    <label className={label}>Descrição<textarea className={input} name="description" maxLength={2000} rows={3} placeholder="O que precisa ser feito?" /></label>
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
    <SubmitButton pendingLabel="Abrindo OS...">Abrir OS</SubmitButton>
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
