"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import {
  createMemberInvitation,
  type InvitationActionState,
} from "@/app/actions/members";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type PermissionItem = {
  key: string;
  module: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type InviteMemberFormProps = {
  permissions: PermissionItem[];
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Produtos",
  stock: "Estoque",
  finance: "Financeiro",
  settings: "Configurações",
  members: "Usuários",
};

export function InviteMemberForm({
  permissions,
}: InviteMemberFormProps) {
  const [state, formAction] =
    useFormState<
      InvitationActionState,
      FormData
    >(
      createMemberInvitation,
      null,
    );

  const [copied, setCopied] =
    useState(false);

  const [copyError, setCopyError] =
    useState<string | null>(null);

  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>([]);

  const groupedPermissions =
    permissions.reduce<
      Record<
        string,
        PermissionItem[]
      >
    >((groups, permission) => {
      const module =
        permission.module ||
        "other";

      if (!groups[module]) {
        groups[module] = [];
      }

      groups[module].push(
        permission,
      );

      return groups;
    }, {});

  function toggleAll() {
    if (
      selectedPermissions.length ===
      permissions.length
    ) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(
        permissions.map(
          (permission) =>
            permission.key,
        ),
      );
    }
  }

  async function copyInviteLink() {
    if (!state?.invitePath) {
      return;
    }

    const fullUrl =
      `${window.location.origin}${state.invitePath}`;

    setCopyError(null);

    try {
      await navigator.clipboard.writeText(
        fullUrl,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Erro ao copiar link:",
        error,
      );

      setCopyError(
        "Não foi possível copiar automaticamente. Selecione o link abaixo.",
      );
    }
  }

  const fullInviteUrl =
    typeof window !== "undefined" &&
    state?.invitePath
      ? `${window.location.origin}${state.invitePath}`
      : state?.invitePath;

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      {state?.error &&
        !state.fieldErrors && (
          <div
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

      {state?.success && (
        <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            {state.success}
          </p>

          {state.invitePath && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700">
                  {fullInviteUrl}
                </code>

                <button
                  type="button"
                  onClick={
                    copyInviteLink
                  }
                  className="inline-flex h-10 items-center justify-center rounded-md border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  {copied
                    ? "Link copiado"
                    : "Copiar link"}
                </button>
              </div>

              {copyError && (
                <p className="text-xs text-red-600">
                  {copyError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Input
        name="email"
        type="email"
        label="E-mail do funcionário *"
        placeholder="funcionario@empresa.com"
        required
        error={
          state?.fieldErrors?.email
        }
      />

      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Permissões iniciais
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Estas permissões serão
            aplicadas quando o funcionário
            aceitar o convite.
          </p>
        </div>

        {permissions.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Nenhuma permissão disponível
            para atribuição.
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
              >
                {selectedPermissions.length ===
                permissions.length
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </button>
            </div>

            {Object.entries(
              groupedPermissions,
            ).map(
              ([module, items]) => (
                <fieldset
                  key={module}
                  className="space-y-3"
                >
                  <legend className="text-sm font-semibold text-slate-800">
                    {MODULE_LABELS[
                      module
                    ] || module}
                  </legend>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map(
                      (
                        permission,
                      ) => (
                        <label
                          key={
                            permission.key
                          }
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            name="permissions"
                            value={
                              permission.key
                            }
                            checked={selectedPermissions.includes(
                              permission.key,
                            )}
                            onChange={(
                              e,
                            ) => {
                              if (
                                e.target
                                  .checked
                              ) {
                                setSelectedPermissions(
                                  (
                                    prev,
                                  ) => [
                                    ...prev,
                                    permission.key,
                                  ],
                                );
                              } else {
                                setSelectedPermissions(
                                  (
                                    prev,
                                  ) =>
                                    prev.filter(
                                      (
                                        p,
                                      ) =>
                                        p !==
                                        permission.key,
                                    ),
                                );
                              }
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />

                          <span>
                            <span className="block text-sm font-medium text-slate-900">
                              {
                                permission.name
                              }
                            </span>

                            {permission.description && (
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {
                                  permission.description
                                }
                              </span>
                            )}

                            <span className="mt-1 block font-mono text-[10px] text-slate-400">
                              {
                                permission.key
                              }
                            </span>
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              ),
            )}
          </>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Criando convite...">
          Gerar link de convite
        </SubmitButton>
      </div>
    </form>
  );
}