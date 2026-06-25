"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

// Validações
const signupSchema = z.object({
  companyName: z.string().min(2, "Nome da empresa muito curto"),
  fullName: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
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
  const admin = createAdminClient();
  const supabase = await createClient();

  // 1) Cria o tenant com um slug único
  const baseSlug = slugify(companyName) || "empresa";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name: companyName, slug })
    .select()
    .single();

  if (tenantErr || !tenant) {
    return { error: `Erro ao criar empresa: ${tenantErr?.message ?? "?"}` };
  }

  // 2) Cria o usuário no Auth (signUp normal, com email redirect)
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tenant_id: tenant.id,
        full_name: fullName,
        role: "owner",
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (signUpErr || !signUpData.user) {
    // Rollback tenant
    await admin.from("tenants").delete().eq("id", tenant.id);
    return { error: signUpErr?.message ?? "Erro ao criar usuário" };
  }

  // 3) O trigger handle_new_user já criou o public.users com tenant_id.
  // Garante que o registro existe (caso o signup seja confirmado depois)
  await admin.from("users").upsert(
    {
      id: signUpData.user.id,
      tenant_id: tenant.id,
      email,
      full_name: fullName,
      role: "owner",
    },
    { onConflict: "id" },
  );

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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email ou senha incorretos" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
