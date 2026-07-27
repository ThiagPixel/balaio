"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const passwordSchema = z
  .string()
  .min(
    8,
    "A senha deve ter no mínimo 8 caracteres",
  )
  .regex(
    /[A-Z]/,
    "A senha deve conter pelo menos 1 letra maiúscula",
  )
  .regex(
    /[a-z]/,
    "A senha deve conter pelo menos 1 letra minúscula",
  )
  .regex(
    /[0-9]/,
    "A senha deve conter pelo menos 1 número",
  )
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "A senha deve conter pelo menos 1 caractere especial",
  );

const signupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(
      2,
      "Nome da empresa muito curto",
    ),

  fullName: z
    .string()
    .trim()
    .min(2, "Nome muito curto"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido"),

  password: passwordSchema,
});

const invitationSignupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Nome muito curto"),

    password: passwordSchema,

    passwordConfirm: z
      .string()
      .min(
        1,
        "Confirme sua senha",
      ),
  })
  .refine(
    (data) =>
      data.password ===
      data.passwordConfirm,
    {
      message:
        "As senhas não coincidem",
      path: ["passwordConfirm"],
    },
  );

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido"),

  password: z
    .string()
    .min(1, "Senha obrigatória"),

  remember: z
    .boolean()
    .optional(),
});

const resetPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email inválido"),
  });

const updatePasswordSchema = z
  .object({
    password: passwordSchema,

    passwordConfirm: z
      .string()
      .min(
        1,
        "Confirme a senha",
      ),
  })
  .refine(
    (data) =>
      data.password ===
      data.passwordConfirm,
    {
      message:
        "As senhas não coincidem",
      path: ["passwordConfirm"],
    },
  );

export type AuthState = {
  error?: string;
  fieldErrors?: Record<
    string,
    string
  >;
} | null;

type PublicInvitation = {
  email: string;
  company_name: string;
  expires_at: string;
};

function getFieldErrors(
  issues: z.ZodIssue[],
) {
  const fieldErrors: Record<
    string,
    string
  > = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] =
        issue.message;
    }
  }

  return fieldErrors;
}

function getAppUrl() {
  return process.env
    .NEXT_PUBLIC_APP_URL
    ?.replace(/\/$/, "");
}

function hashInvitationToken(
  token: string,
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function signup(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed =
    signupSchema.safeParse({
      companyName:
        formData.get("companyName"),

      fullName:
        formData.get("fullName"),

      email:
        formData.get("email"),

      password:
        formData.get("password"),
    });

  if (!parsed.success) {
    return {
      error:
        "Verifique os campos",

      fieldErrors:
        getFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const appUrl = getAppUrl();

  if (!appUrl) {
    return {
      error:
        "Configuração incompleta: NEXT_PUBLIC_APP_URL não está definido.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: signUpData,
    error: signUpError,
  } = await supabase.auth.signUp({
    email: parsed.data.email,
    password:
      parsed.data.password,

    options: {
      data: {
        signup_flow:
          "create_company",

        company_name:
          parsed.data.companyName,

        full_name:
          parsed.data.fullName,
      },

      emailRedirectTo:
        `${appUrl}/auth/callback`,
    },
  });

  if (
    signUpError ||
    !signUpData.user
  ) {
    console.error(
      "Erro ao criar usuário:",
      {
        code: signUpError?.code,
        message:
          signUpError?.message,
        status:
          signUpError?.status,
      },
    );

    return {
      error:
        signUpError?.message ??
        "Não foi possível criar sua conta.",
    };
  }

  if (signUpData.session) {
    revalidatePath(
      "/",
      "layout",
    );

    redirect("/");
  }

  return {
    error:
      "Conta criada! Verifique seu email para confirmar o acesso. Se não receber, cheque a caixa de spam.",
  };
}

export async function signupWithInvitation(
  invitationToken: string,
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token =
    invitationToken.trim();

  if (
    !token ||
    token.length < 32 ||
    token.length > 200
  ) {
    return {
      error:
        "O convite informado é inválido.",
    };
  }

  const parsed =
    invitationSignupSchema.safeParse({
      fullName:
        formData.get("fullName"),

      password:
        formData.get("password"),

      passwordConfirm:
        formData.get(
          "passwordConfirm",
        ),
    });

  if (!parsed.success) {
    return {
      error:
        "Verifique os campos",

      fieldErrors:
        getFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const appUrl = getAppUrl();

  if (!appUrl) {
    return {
      error:
        "Configuração incompleta: NEXT_PUBLIC_APP_URL não está definido.",
    };
  }

  const tokenHash =
    hashInvitationToken(token);

  const supabase =
    await createClient();

  /*
   * O e-mail vem do banco.
   * Não confiamos em um e-mail enviado pelo formulário.
   */
  const {
    data: invitationRows,
    error: invitationError,
  } = await supabase.rpc(
    "get_member_invitation_public",
    {
      p_token_hash: tokenHash,
    },
  );

  if (invitationError) {
    console.error(
      "Erro ao validar convite:",
      {
        code:
          invitationError.code,
        message:
          invitationError.message,
        details:
          invitationError.details,
        hint:
          invitationError.hint,
      },
    );

    return {
      error:
        "Não foi possível validar este convite.",
    };
  }

  const invitation =
    invitationRows?.[0] as
      | PublicInvitation
      | undefined;

  if (!invitation) {
    return {
      error:
        "Este convite é inválido, expirou ou já foi utilizado.",
    };
  }

  const {
    data: signUpData,
    error: signUpError,
  } = await supabase.auth.signUp({
    email: invitation.email,

    password:
      parsed.data.password,

    options: {
      data: {
        signup_flow:
          "accept_invitation",

        invitation_token_hash:
          tokenHash,

        full_name:
          parsed.data.fullName,
      },

      emailRedirectTo:
        `${appUrl}/auth/callback`,
    },
  });

  if (
    signUpError ||
    !signUpData.user
  ) {
    console.error(
      "Erro ao aceitar convite:",
      {
        code: signUpError?.code,
        message:
          signUpError?.message,
        status:
          signUpError?.status,
      },
    );

    const message =
      signUpError?.message
        ?.toLowerCase();

    if (
      message?.includes(
        "already registered",
      ) ||
      message?.includes(
        "already exists",
      )
    ) {
      return {
        error:
          "Já existe uma conta com este e-mail. Entre na conta existente.",
      };
    }

    return {
      error:
        signUpError?.message ??
        "Não foi possível aceitar o convite.",
    };
  }

  if (signUpData.session) {
    revalidatePath(
      "/",
      "layout",
    );

    redirect("/");
  }

  return {
    error:
      "Conta criada! Verifique seu email para confirmar o acesso à empresa.",
  };
}

export async function login(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed =
    loginSchema.safeParse({
      email:
        formData.get("email"),

      password:
        formData.get("password"),

      remember:
        formData.get("remember") ===
        "on",
    });

  if (!parsed.success) {
    return {
      error:
        "Verifique os campos",

      fieldErrors:
        getFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth
      .signInWithPassword({
        email:
          parsed.data.email,

        password:
          parsed.data.password,
      });

  if (error) {
    return {
      error:
        "Email ou senha incorretos",
    };
  }

  revalidatePath(
    "/",
    "layout",
  );

  redirect("/");
}

export async function resetPassword(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed =
    resetPasswordSchema.safeParse({
      email:
        formData.get("email"),
    });

  if (!parsed.success) {
    return {
      error:
        "Verifique os campos",

      fieldErrors:
        getFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const appUrl = getAppUrl();

  if (!appUrl) {
    return {
      error:
        "Configuração incompleta: NEXT_PUBLIC_APP_URL não está definido.",
    };
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth
      .resetPasswordForEmail(
        parsed.data.email,
        {
          redirectTo:
            `${appUrl}/reset-password`,
        },
      );

  if (error) {
    return {
      error:
        "Não foi possível enviar o email. Tente novamente.",
    };
  }

  return {
    error:
      "Sucesso! Verifique seu email para redefinir sua senha. O link expira em 24 horas.",
  };
}

export async function updatePassword(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed =
    updatePasswordSchema.safeParse({
      password:
        formData.get("password"),

      passwordConfirm:
        formData.get(
          "passwordConfirm",
        ),
    });

  if (!parsed.success) {
    return {
      error:
        "Verifique os campos",

      fieldErrors:
        getFieldErrors(
          parsed.error.issues,
        ),
    };
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.updateUser({
      password:
        parsed.data.password,
    });

  if (error) {
    return {
      error:
        "Não foi possível redefinir a senha. Tente novamente.",
    };
  }

  return {
    error:
      "Sucesso! Sua senha foi atualizada.",
  };
}

export async function logout() {
  const supabase =
    await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath(
    "/",
    "layout",
  );

  redirect("/login");
}