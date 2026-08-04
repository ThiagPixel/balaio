"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import {
  saveMemberPermissions,
  type MemberActionState,
} from "@/app/actions/members";

type PermissionItem = {
  key: string;
  module: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type MemberItem = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "member";
  active: boolean;
  permissions: string[];
};

type MemberPermissionsFormProps = {
  member: MemberItem;
  permissions: PermissionItem[];
  canManage: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Produtos",
  stock: "Estoque",
  finance: "Financeiro",
  settings: "Configurações",
  members: "Usuários",
};

export function MemberPermissionsForm({
  member,
  permissions,
  canManage,
}: MemberPermissionsFormProps) {
  const action = saveMemberPermissions.bind(
    null,
    member.id,
  );

  const [state, formAction] =
    useFormState<MemberActionState, FormData>(
      action,
      null,
    );

  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>(member.permissions);

  const groupedPermissions =
    permissions.reduce<Record<string, PermissionItem[]>>(
      (groups, permission) => {
        const module = permission.module || "other";

        if (!groups[module]) {
          groups[module] = [];
        }

        groups[module].push(permission);

        return groups;
      },
      {},
    );

  function toggleAll() {
    if (
      selectedPermissions.length ===
      permissions.length
    ) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(
        permissions.map((p) => p.key),
      );
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      {state?.error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.success}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
          >
            {selectedPermissions.length === permissions.length
              ? "Desmarcar todas"
              : "Marcar todas"}
          </button>
        </div>
      )}

      {Object.entries(groupedPermissions).map(
        ([module, items]) => (
          <fieldset
            key={module}
            className="space-y-3"
            disabled={!canManage}
          >
            <legend className="text-sm font-semibold text-slate-900">
              {MODULE_LABELS[module] ??
                module}
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((permission) => (
                <label
                  key={permission.key}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3"
                >
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission.key}
                    checked={selectedPermissions.includes(
                      permission.key,
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPermissions(
                          (prev) => [
                            ...prev,
                            permission.key,
                          ],
                        );
                      } else {
                        setSelectedPermissions(
                          (prev) =>
                            prev.filter(
                              (p) =>
                                p !==
                                permission.key,
                            ),
                        );
                      }
                    }}
                    disabled={!canManage}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      {permission.name}
                    </span>

                    {permission.description && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {permission.description}
                      </span>
                    )}

                    <span className="mt-1 block font-mono text-[10px] text-slate-400">
                      {permission.key}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ),
      )}

      {canManage && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            Salvar permissões
          </button>
        </div>
      )}
    </form>
  );
}