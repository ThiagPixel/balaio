"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  revokeMemberInvitation,
  type MemberActionState,
} from "@/app/actions/members";

type InvitationRevokeButtonProps = {
  invitationId: string;
};

export function InvitationRevokeButton({
  invitationId,
}: InvitationRevokeButtonProps) {
  const router = useRouter();

  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<MemberActionState>(null);

  function handleRevoke() {
    const confirmed =
      window.confirm(
        "Revogar este convite? O link deixará de funcionar.",
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await revokeMemberInvitation(
          invitationId,
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
        onClick={handleRevoke}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Revogando..."
          : "Revogar"}
      </button>

      {message?.error && (
        <p
          role="alert"
          className="max-w-64 text-right text-xs text-red-600"
        >
          {message.error}
        </p>
      )}

      {message?.success && (
        <p className="max-w-64 text-right text-xs text-emerald-600">
          {message.success}
        </p>
      )}
    </div>
  );
}