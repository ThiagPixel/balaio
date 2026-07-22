"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createTenantWithAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

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

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    companyName: formData.get("companyName") as string,
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const { companyName, fullName, email, password } = parsed.data;
  const supabase = await createClient();

  // 1) Cria o usuário no Auth primeiro (precisa do user_id para a RPC)
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tenant_id: "pending", // placeholder até criar tenant
        full_name: fullName,
        role: "owner",
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (signUpErr || !signUpData.user) {
    return { error: signUpErr?.message ?? "Erro ao criar usuário" };
  }

  const userId = signUpData.user.id;

  // 2) Cria o tenant e users via RPC (bypassa RLS)
  const baseSlug = slugify(companyName) || "empresa";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    await createTenantWithAdmin(companyName, slug, userId, email, fullName);
  } catch (err: unknown) {
    return {
      error: `Erro ao criar empresa: ${err instanceof Error ? err.message : "?"}`,
    };
  }

  // Se confirmação de email estiver desabilitada no Supabase, o user já
  // está logado. Caso contrário, exibimos uma mensagem.
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Configuração incompleta: NEXT_PUBLIC_APP_URL não está definido." };
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
