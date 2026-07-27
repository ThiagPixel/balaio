"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  setMemberActive,
  type MemberActionState,
} from "@/app/actions/members";

export function MemberActiveButton({
  memberId,
  active,
}: {
  memberId: string;
  active: boolean;
}) {
  const router = useRouter();

  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<MemberActionState>(null);

  function handleClick() {
    const nextActive = !active;

    const confirmed =
      window.confirm(
        nextActive
          ? "Ativar este usuário?"
          : "Desativar este usuário? Ele perderá o acesso à empresa.",
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await setMemberActive(
          memberId,
          nextActive,
        );

      setMessage(result);

      if (result?.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`text-sm font-medium disabled:opacity-50 ${
          active
            ? "text-red-600 hover:text-red-700"
            : "text-emerald-600 hover:text-emerald-700"
        }`}
      >
        {pending
          ? "Salvando..."
          : active
            ? "Desativar usuário"
            : "Ativar usuário"}
      </button>

      {message?.error && (
        <p className="max-w-72 text-right text-xs text-red-600">
          {message.error}
        </p>
      )}

      {message?.success && (
        <p className="max-w-72 text-right text-xs text-emerald-600">
          {message.success}
        </p>
      )}
    </div>
  );
}