import "server-only";

type AccountStatus = {
  user_id: string;
  tenant_id: string;
  active: boolean;
  role: "owner" | "member";
};

export class AccountDisabledError extends Error {
  readonly code = "ACCOUNT_DISABLED";

  constructor(
    message =
      "Sua conta está desativada. Entre em contato com o administrador da empresa.",
  ) {
    super(message);

    this.name = "AccountDisabledError";
  }
}

export function isAccountDisabledError(
  error: unknown,
): error is AccountDisabledError {
  return (
    error instanceof
    AccountDisabledError
  );
}

export async function requireTenant() {
  const { createClient } =
    await import("./server");

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Usuário não autenticado.",
    );
  }

  const {
    data: accountRows,
    error: accountError,
  } = await supabase.rpc(
    "get_my_account_status",
  );

  if (accountError) {
    console.error(
      "Erro ao carregar status da conta:",
      {
        userId: user.id,
        code: accountError.code,
        message:
          accountError.message,
        details:
          accountError.details,
        hint: accountError.hint,
      },
    );

    throw new Error(
      `Não foi possível carregar o status da conta: ${accountError.message}`,
    );
  }

  const account =
    accountRows?.[0] as
      | AccountStatus
      | undefined;

  if (!account) {
    console.error(
      "Usuário autenticado sem vínculo empresarial:",
      {
        userId: user.id,
        email: user.email,
      },
    );

    throw new Error(
      "Usuário autenticado, mas sem empresa vinculada.",
    );
  }

  if (
    account.user_id !== user.id
  ) {
    throw new Error(
      "O vínculo retornado não pertence ao usuário autenticado.",
    );
  }

  if (!account.active) {
    throw new AccountDisabledError();
  }

  if (!account.tenant_id) {
    throw new Error(
      "Usuário sem empresa vinculada.",
    );
  }

  return {
    supabase,
    user,
    tenantId: account.tenant_id,
    account,
  };
}