"use client";

import { useState, useTransition } from "react";

import {
  deleteProduct,
  toggleProductActive,
  type ProductState,
} from "@/app/actions/products";

type ActionMessage = {
  type: "success" | "error";
  text: string;
} | null;

function getActionMessage(
  result: ProductState,
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

export function ToggleProductActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<ActionMessage>(null);

  function handleToggle() {
    setMessage(null);

    startTransition(async () => {
      const result =
        await toggleProductActive(
          id,
          !active,
        );

      setMessage(
        getActionMessage(result),
      );
    });
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Salvando..."
          : active
            ? "Desativar"
            : "Ativar"}
      </button>

      {message && (
        <p
          role="alert"
          className={`mt-1 max-w-64 text-left text-xs ${
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

export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<ActionMessage>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Excluir "${name}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await deleteProduct(id);

      setMessage(
        getActionMessage(result),
      );
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Excluindo..."
          : "Excluir"}
      </button>

      {message && (
        <p
          role="alert"
          className={`mt-1 max-w-72 text-right text-xs ${
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