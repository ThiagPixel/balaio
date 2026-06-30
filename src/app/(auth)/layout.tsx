export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Balaio</h1>
          <p className="text-sm text-slate-500">
            Estoque e financeiro, simples e multi-tenant
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
