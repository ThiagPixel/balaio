"use client";

import { useState } from "react";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const formatDisplay = (iso: string) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function BrazilDatePicker({ value, min, onChange, name = "due_date" }: {
  value: string; min: string; onChange: (value: string) => void; name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => value.slice(0, 7));
  const [year, month] = visibleMonth.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  function changeMonth(offset: number) {
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    setVisibleMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return <div className="mt-1">
    <input type="hidden" name={name} value={value} />
    <button type="button" aria-label={`Selecionar prazo; data atual ${formatDisplay(value)}`} aria-expanded={open}
      onClick={() => { setVisibleMonth(value.slice(0, 7)); setOpen(!open); }}
      className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
      <span>{formatDisplay(value)}</span><span aria-hidden="true">▦</span>
    </button>
    {open && <div className="mt-2 w-full max-w-xs rounded-lg border border-slate-200 bg-white p-3 shadow-md" role="group" aria-label="Calendário do prazo">
      <div className="mb-3 flex items-center justify-between"><button type="button" aria-label="Mês anterior" disabled={visibleMonth <= min.slice(0, 7)} onClick={() => changeMonth(-1)} className="rounded px-2 py-1 text-brand-600 disabled:text-slate-300">‹</button><strong className="text-sm capitalize text-slate-900">{monthLabel}</strong><button type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)} className="rounded px-2 py-1 text-brand-600">›</button></div>
      <div className="grid grid-cols-7 text-center text-xs text-slate-500">{weekdays.map((day) => <span key={day} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = isoDate(year, month - 1, day);
        return <button key={date} type="button" aria-label={`${String(day).padStart(2, "0")} de ${monthLabel}`} aria-pressed={date === value} disabled={date < min}
          onClick={() => { onChange(date); setOpen(false); }}
          className={`h-9 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${date === value ? "bg-brand-600 font-semibold text-white" : "text-slate-800 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`}>{day}</button>;
      })}</div>
    </div>}
    <p className="mt-1 text-xs text-slate-500">Formato: dia/mês/ano. Selecione hoje ou uma data futura.</p>
  </div>;
}
