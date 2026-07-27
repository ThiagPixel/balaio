import "server-only";

import { redirect } from "next/navigation";

import type { PermissionKey } from "@/lib/auth/permissions";

import {
  isAccountDisabledError,
  requireTenant,
} from "./tenant";

export type UserRole =
  | "owner"
  | "member";

export type AccessTenant = {
  id: string;
  name: string;
  slug: string;
};

export type AccessContext = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
  tenant: AccessTenant;
  permissions: PermissionKey[];
};

export class PermissionDeniedError extends Error {
  readonly code = "FORBIDDEN";

  constructor(
    readonly permission: PermissionKey,
    message =
      "Você não possui permissão para realizar esta ação.",
  ) {
    super(message);

    this.name =
      "PermissionDeniedError";
  }
}

export async function getAccessContext(): Promise<AccessContext> {
  let tenantAccess:
    | Awaited<
        ReturnType<
          typeof requireTenant
        >
      >
    | undefined;

  try {
    tenantAccess =
      await requireTenant();
  } catch (error) {
    if (
      isAccountDisabledError(error)
    ) {
      redirect(
        "/account-disabled",
      );
    }

    throw error;
  }

  const { supabase } =
    tenantAccess;

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_access_context",
  );

  if (error) {
    console.error(
      "Erro ao carregar contexto de acesso:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      `Não foi possível carregar o contexto de acesso: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Contexto de acesso não encontrado para o usuário autenticado.",
    );
  }

  const accessContext =
    data as AccessContext;

  if (
    accessContext.active !== true
  ) {
    redirect(
      "/account-disabled",
    );
  }

  return accessContext;
}

export async function requirePermission(
  permission: PermissionKey,
) {
  let access:
    | Awaited<
        ReturnType<
          typeof requireTenant
        >
      >
    | undefined;

  try {
    access =
      await requireTenant();
  } catch (error) {
    if (
      isAccountDisabledError(error)
    ) {
      throw new PermissionDeniedError(
        permission,
        error.message,
      );
    }

    throw error;
  }

  const {
    data: allowed,
    error,
  } = await access.supabase.rpc(
    "has_permission",
    {
      p_permission_key:
        permission,
    },
  );

  if (error) {
    console.error(
      "Erro ao verificar permissão:",
      {
        userId: access.user.id,
        tenantId:
          access.tenantId,
        permission,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      `Não foi possível validar a permissão: ${error.message}`,
    );
  }

  if (allowed !== true) {
    throw new PermissionDeniedError(
      permission,
    );
  }

  return access;
}

export function can(
  accessContext: AccessContext,
  permission: PermissionKey,
): boolean {
  return accessContext.permissions.includes(
    permission,
  );
}

export function canAll(
  accessContext: AccessContext,
  permissions: PermissionKey[],
): boolean {
  return permissions.every(
    (permission) =>
      can(
        accessContext,
        permission,
      ),
  );
}

export function canAny(
  accessContext: AccessContext,
  permissions: PermissionKey[],
): boolean {
  return permissions.some(
    (permission) =>
      can(
        accessContext,
        permission,
      ),
  );
}

export function isPermissionDeniedError(
  error: unknown,
): error is PermissionDeniedError {
  return (
    error instanceof
    PermissionDeniedError
  );
}

export async function requirePagePermission(
  permission: PermissionKey,
): Promise<AccessContext> {
  const accessContext =
    await getAccessContext();

  if (
    !can(
      accessContext,
      permission,
    )
  ) {
    redirect("/forbidden");
  }

  return accessContext;
}