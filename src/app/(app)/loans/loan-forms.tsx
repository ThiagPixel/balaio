"use client";

import { useFormState } from "react-dom";
import { finishLoan, saveLoanItem, startLoan } from "@/app/actions/loans";
import type { LoanItem } from "@/lib/loans";
import { SubmitButton } from "@/components/ui/submit-button";

const input = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const label = "block text-sm font-medium text-slate-700";

function Feedback({ state }: { state: { error?: string; success?: string } | null }) {
  return <>{state?.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</p>}</>;
}

export function ItemForm({ item }: { item?: LoanItem }) {
  const [state, action] = useFormState(saveLoanItem, null);
  return <form action={action} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <Feedback state={state} /><input type="hidden" name="item_id" value={item?.id ?? ""} />
    <label className={label}>Nome do item<input className={input} name="name" maxLength={120} required minLength={2} defaultValue={item?.name} placeholder="Chave da sala 204" /></label>
    <label className={label}>Identificação do exemplar<input className={input} name="identifier" maxLength={80} required defaultValue={item?.identifier} placeholder="Cópia 1" /><span className="mt-1 block text-xs font-normal text-slate-500">Única dentro da empresa. Pode ser número, etiqueta ou código.</span></label>
    <label className={label}>Descrição (opcional)<textarea className={input} name="description" maxLength={500} rows={3} defaultValue={item?.description ?? ""} /></label>
    {item && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="active" defaultChecked={item.active} />Ativo para novos empréstimos</label>}
    {!item && <input type="hidden" name="active" value="on" />}
    <SubmitButton>Salvar exemplar</SubmitButton>
  </form>;
}

export function CheckoutForm({ items, today }: { items: LoanItem[]; today: string }) {
  const [state, action] = useFormState(startLoan, null);
  return <form action={action} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <Feedback state={state} />
    <label className={label}>Exemplar disponível<select className={input} name="item_id" required defaultValue=""><option value="" disabled>Selecione o exemplar</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.identifier}</option>)}</select></label>
    <label className={label}>Nome de quem recebe<input className={input} name="borrower_name" required minLength={2} maxLength={120} placeholder="Nome completo" /></label>
    <label className={label}>Vínculo ou empresa (opcional)<input className={input} name="borrower_affiliation" maxLength={120} placeholder="Funcionário, prestador, empresa..." /></label>
    <label className={label}>Devolução prevista<input className={input} type="date" name="due_date" min={today} required /></label>
    <label className={label}>Observações (opcional)<textarea className={input} name="notes" rows={3} maxLength={1000} /></label>
    <p className="text-xs text-slate-500">Ao confirmar, você autoriza o empréstimo. O exemplar ficará indisponível até a devolução.</p>
    <SubmitButton>Confirmar empréstimo</SubmitButton>
  </form>;
}

export function ReturnForm({ loan }: { loan: { id: string; item_name: string; item_identifier: string; borrower_name: string; due_date: string } }) {
  const [state, action] = useFormState(finishLoan, null);
  return <form action={action} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <Feedback state={state} /><input type="hidden" name="loan_id" value={loan.id} />
    <div className="rounded-md bg-slate-50 p-4 text-sm"><strong>{loan.item_name} · {loan.item_identifier}</strong><p className="mt-1 text-slate-600">Entregue a {loan.borrower_name} · devolução prevista em {new Date(`${loan.due_date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div>
    <label className={label}>Condição e observações na devolução (opcional)<textarea className={input} name="notes" rows={4} maxLength={1000} placeholder="Ex.: devolvido em boas condições" /></label>
    <p className="text-xs text-slate-500">Ao confirmar, você registra o recebimento e libera o exemplar para outro empréstimo.</p>
    <SubmitButton>Confirmar devolução</SubmitButton>
  </form>;
}
