"use client";
/* eslint-disable @next/next/no-img-element -- URL privada e temporária, sem proxy de otimização. */

import { useRef } from "react";

export function OrderPhoto({ src, title }: { src: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="group relative shrink-0 overflow-hidden rounded-md border border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" aria-label={`Ver foto da OS: ${title}`}>
      <img src={src} alt={`Foto do serviço: ${title}`} loading="lazy" className="h-24 w-36 object-cover sm:h-28 sm:w-40" />
      <span className="absolute inset-x-0 bottom-0 bg-slate-900/75 px-2 py-1 text-center text-xs font-medium text-white group-hover:bg-slate-900/90">Ver foto ↗</span>
    </button>
    <dialog ref={dialog} aria-label={`Foto do serviço: ${title}`} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }} className="w-[min(94vw,960px)] max-w-none rounded-lg border border-slate-200 bg-white p-3 shadow-xl backdrop:bg-slate-950/70 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><p className="min-w-0 truncate text-sm font-semibold text-slate-900">Foto · {title}</p><button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar foto" className="rounded-md px-3 py-1 text-xl leading-none text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">×</button></div>
      <img src={src} alt={`Foto ampliada do serviço: ${title}`} className="mx-auto max-h-[78vh] max-w-full object-contain" />
    </dialog>
  </>;
}
