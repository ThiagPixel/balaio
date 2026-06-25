"use client";

import { useTransition } from "react";
import { toggleProductActive, deleteProduct } from "@/app/actions/products";

export function ToggleProductActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => toggleProductActive(id, !active))}
      disabled={pending}
      className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
    >
      {active ? "Desativar" : "Ativar"}
    </button>
  );
}

export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) {
          start(() => deleteProduct(id));
        }
      }}
      disabled={pending}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
