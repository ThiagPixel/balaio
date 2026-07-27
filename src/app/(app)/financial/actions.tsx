"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  deleteTransaction,
  updateTransactionStatus,
  type TransactionState,
  type TransactionStatus,
} from "@/app/actions/transactions";

type ActionMessage = {
  type: "success" | "error";
  text: string;
} | null;

function getMessage(
  result: TransactionState,
): ActionMessage {
  if (result?.error) {
    return {
      type: "error",
      text: result.error,
    };
  }

  if (result?.success) {
    return {
      type: "success",
      text: result.success,
    };
  }

  return null;
}

type StatusButtonsProps = {
  id: string;
  status: TransactionStatus;
  canSettle: boolean;
  canReopen: boolean;
  canCancel: boolean;
};

export function TransactionStatusButtons({
  id,
  status,
  canSettle,
  canReopen,
  canCancel,
}: StatusButtonsProps) {
  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<ActionMessage>(null);

  function changeStatus(
    targetStatus: TransactionStatus,
  ) {
    setMessage(null);

    startTransition(async () => {
      const result =
        await updateTransactionStatus(
          id,
          targetStatus,
        );

      setMessage(
        getMessage(result),
      );
    });
  }

  if (status === "CANCELLED") {
    return null;
  }

  const hasStatusAction =
    (status === "PENDING" &&
      canSettle) ||
    (status === "PAID" &&
      canReopen) ||
    canCancel;

  if (!hasStatusAction) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-3">
        {status === "PENDING" &&
          canSettle && (
            <button
              type="button"
              onClick={() =>
                changeStatus("PAID")
              }
              disabled={pending}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              {pending
                ? "Salvando..."
                : "Marcar como pago"}
            </button>
          )}

        {status === "PAID" &&
          canReopen && (
            <button
              type="button"
              onClick={() =>
                changeStatus("PENDING")
              }
              disabled={pending}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              {pending
                ? "Salvando..."
                : "Reabrir"}
            </button>
          )}

        {canCancel && (
          <button
            type="button"
            onClick={() => {
              const confirmed =
                window.confirm(
                  "Cancelar este lançamento?",
                );

              if (confirmed) {
                changeStatus(
                  "CANCELLED",
                );
              }
            }}
            disabled={pending}
            className="text-sm font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>

      {message && (
        <p
          role="alert"
          className={`max-w-72 text-right text-xs ${
            message.type === "error"
              ? "text-red-600"
              : "text-emerald-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export function DeleteTransactionButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<ActionMessage>(null);

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Excluir "${description}"?`,
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await deleteTransaction(id);

      setMessage(
        getMessage(result),
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        {pending
          ? "Excluindo..."
          : "Excluir"}
      </button>

      {message && (
        <p
          role="alert"
          className={`max-w-72 text-right text-xs ${
            message.type === "error"
              ? "text-red-600"
              : "text-emerald-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}