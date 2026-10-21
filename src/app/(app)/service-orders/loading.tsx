export default function ServiceOrdersLoading() {
  return <div role="status" aria-label="Carregando ordens de serviço" className="space-y-6 animate-pulse motion-reduce:animate-none"><div className="h-9 w-64 rounded bg-slate-200" /><div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-slate-200" />)}</div><div className="h-12 rounded bg-slate-200" /><div className="h-80 rounded-lg bg-slate-200" /><span className="sr-only">Carregando ordens de serviço...</span></div>;
}
