import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Acesso negado
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Você não possui permissão
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          Sua conta não tem autorização para acessar esta área ou executar
          esta operação.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Voltar para a dashboard
        </Link>
      </div>
    </main>
  );
}