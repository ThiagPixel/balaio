export default function ServiceOrderLoading() {
  return <div role="status" aria-label="Carregando ordem de serviço" className="space-y-6 animate-pulse motion-reduce:animate-none"><div className="h-9 w-80 rounded bg-slate-200" /><div className="h-24 rounded-lg bg-slate-200" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-80 rounded-lg bg-slate-200" /><div className="h-80 rounded-lg bg-slate-200" /></div><span className="sr-only">Carregando ordem de serviço...</span></div>;
}
