"use client";

import { useTransition } from "react";
import {
  updateTransactionStatus,
  deleteTransaction,
} from "@/app/actions/transactions";

export function TransactionStatusButtons({
  id,
  status,
}: {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
}) {
  const [pending, start] = useTransition();

  if (status === "PAID") {
    return (
      <button
        onClick={() => start(() => updateTransactionStatus(id, "PENDING"))}
        disabled={pending}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
      >
        Reabrir
      </button>
    );
  }

  return (
    <button
      onClick={() => start(() => updateTransactionStatus(id, "PAID"))}
      disabled={pending}
      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
    >
      Marcar como pago
    </button>
  );
}

export function DeleteTransactionButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm(`Excluir "${description}"?`)) {
          start(() => deleteTransaction(id));
        }
      }}
      disabled={pending}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
