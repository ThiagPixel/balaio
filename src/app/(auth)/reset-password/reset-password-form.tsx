"use client";

import { useFormState } from "react-dom";
import { updatePassword, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResetPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    updatePassword,
    null,
  );

  const success = state?.error?.startsWith("Sucesso!");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Digite sua nova senha</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div
              className={`rounded-md p-3 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {state.error}
            </div>
          )}

          <Input
            name="password"
            type="password"
            label="Nova senha"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            error={state?.fieldErrors?.password}
            disabled={success}
          />

          <Input
            name="passwordConfirm"
            type="password"
            label="Confirmar senha"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            error={state?.fieldErrors?.passwordConfirm}
            disabled={success}
          />

          <SubmitButton
            pendingLabel="Atualizando..."
            className="w-full"
            disabled={success}
          >
            Redefinir senha
          </SubmitButton>

          {success && (
            <div className="text-center text-sm text-slate-600">
              Senha atualizada com sucesso!{" "}
              <a href="/login" className="font-medium text-blue-600 hover:underline">
                Faça login
              </a>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
