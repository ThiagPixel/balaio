"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordWrapper() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    async function handleRecoveryToken() {
      const supabase = createClient();

      // Verifica se há um código PKCE na URL (query param 'code')
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      // Se há um código PKCE, troca por sessão
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          setStatus("ready");
          // Limpa a URL do código
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      }

      // Verifica se já há uma sessão válida (pode ter sido estabelecida automaticamente)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStatus("ready");
        return;
      }

      // Se não há código nem sessão, verifica se há token de recuperação no hash
      // O Supabase às vezes coloca o token no hash da URL
      const hash = window.location.hash;
      if (hash && hash.includes("token=")) {
        setStatus("ready");
        return;
      }

      setStatus("error");
    }

    handleRecoveryToken();
  }, []);

  if (status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Verificando link de recuperação...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            Este link de recuperação expirou ou é inválido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Solicite um novo link de recuperação{" "}
            <a href="/forgot-password" className="font-medium text-brand-600 hover:underline">
              aqui
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
