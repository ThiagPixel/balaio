"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { resetPassword, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    resetPassword,
    null,
  );

  const success = state?.error?.startsWith("Sucesso!");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Digite seu email para receber um link de redefinição
        </CardDescription>
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
            name="email"
            type="email"
            label="Email"
            placeholder="voce@empresa.com"
            required
            autoComplete="email"
            error={state?.fieldErrors?.email}
            disabled={success}
          />

          <SubmitButton
            pendingLabel="Enviando..."
            className="w-full"
            disabled={success}
          >
            Enviar link de redefinição
          </SubmitButton>

          <p className="text-center text-sm text-slate-600">
            Voltar para{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
