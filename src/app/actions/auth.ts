"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Validações
const signupSchema = z.object({
  companyName: z.string().min(2, "Nome da empresa muito curto"),
  fullName: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos 1 letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos 1 letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos 1 número")
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "A senha deve conter pelo menos 1 caractere especial",
    ),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  remember: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos 1 letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos 1 letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos 1 número")
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "A senha deve conter pelo menos 1 caractere especial",
    ),
  passwordConfirm: z.string().min(1, "Confirme a senha"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"],
});

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/* Updating signup because we are transferring the responsibility to the database */

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    companyName: formData.get("companyName"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signupSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    parsed.error.errors.forEach((err) => {
      if (err.path[0]) {
        fieldErrors[err.path[0] as string] = err.message;
      }
    });

    return {
      error: "Verifique os campos",
      fieldErrors,
    };
  }

  const {
    companyName,
    fullName,
    email,
    password,
  } = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!appUrl) {
    return {
      error:
        "Configuração incompleta: NEXT_PUBLIC_SUPABASE_URL não está definido.",
    };
  }

  const supabase = await createClient();

  const {
    data: signUpData,
    error: signUpError,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        /*
         * Estes são apenas dados de entrada para o trigger.
         *
         * O cliente NÃO determina:
         * - tenant_id
         * - slug definitivo
         * - role
         */
        signup_flow: "create_company",
        company_name: companyName,
        full_name: fullName,
      },

      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (signUpError || !signUpData.user) {
    console.error("Erro ao criar usuário:", {
      code: signUpError?.code,
      message: signUpError?.message,
      status: signUpError?.status,
    });

    return {
      error:
        signUpError?.message ??
        "Não foi possível criar sua conta.",
    };
  }

  /*
   * Quando chegarmos aqui, o trigger do Supabase já deve ter:
   *
   * 1. Criado o usuário em auth.users.
   * 2. Criado o tenant em public.tenants.
   * 3. Criado o vínculo usuário ↔ tenant.
   * 4. Definido o usuário como owner.
   *
   * Se o trigger falhar, o signUp deve retornar erro.
   */

  if (signUpData.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    error:
      "Conta criada! Verifique seu email para confirmar o acesso. Se não receber, cheque a caixa de spam.",
  };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    remember: formData.get("remember") === "on",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email ou senha incorretos" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!appUrl) {
    return { error: "Configuração incompleta: NEXT_PUBLIC_SUPABASE_URL não está definido." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    return { error: "Não foi possível enviar o email. Tente novamente." };
  }

  return {
    error:
      "Sucesso! Verifique seu email para redefinir sua senha. O link expira em 24 horas.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    password: formData.get("password") as string,
    passwordConfirm: formData.get("passwordConfirm") as string,
  };

  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Não foi possível redefinir a senha. Tente novamente." };
  }

  return { error: "Sucesso! Sua senha foi atualizada." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}
