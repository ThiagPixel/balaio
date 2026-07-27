import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";

import { TransactionForm } from "./transaction-form";

export default async function NewTransactionPage() {
  const access =
    await requirePagePermission(
      PERMISSIONS.FINANCE_CREATE,
    );

  const canSettle = can(
    access,
    PERMISSIONS.FINANCE_SETTLE,
  );

  const canCancel = can(
    access,
    PERMISSIONS.FINANCE_CANCEL,
  );

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

      <TransactionForm
        canSettle={canSettle}
        canCancel={canCancel}
      />
    </div>
  );
}