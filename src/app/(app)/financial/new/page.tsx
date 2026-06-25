import Link from "next/link";
import { TransactionForm } from "./transaction-form";

export default function NewTransactionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/financial"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Novo lançamento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registre uma conta a pagar ou a receber
        </p>
      </div>
      <TransactionForm />
    </div>
  );
}
