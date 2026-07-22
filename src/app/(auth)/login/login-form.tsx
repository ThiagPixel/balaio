"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(login, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse sua conta para gerenciar estoque e finanças
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
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
          />

          <Input
            name="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            error={state?.fieldErrors?.password}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="remember"
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Lembrar-me
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Esqueci minha senha
            </Link>
          </div>

          <SubmitButton pendingLabel="Entrando..." className="w-full">
            Entrar
          </SubmitButton>

          <p className="text-center text-sm text-slate-600">
            Não tem conta?{" "}
            <Link
              href="/signup"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Criar empresa
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
