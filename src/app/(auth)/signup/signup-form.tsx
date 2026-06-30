"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signup, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignupForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signup, null);

  const success = state?.error?.startsWith("Conta criada");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar empresa</CardTitle>
        <CardDescription>
          Crie sua conta e a empresa para começar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div
              className={`rounded-md p-3 text-sm ${
                success
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {state.error}
            </div>
          )}

          <Input
            name="companyName"
            type="text"
            label="Nome da empresa"
            placeholder="Minha Empresa Ltda"
            required
            autoComplete="organization"
            error={state?.fieldErrors?.companyName}
          />

          <Input
            name="fullName"
            type="text"
            label="Seu nome"
            placeholder="João da Silva"
            required
            autoComplete="name"
            error={state?.fieldErrors?.fullName}
          />

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
            minLength={6}
            autoComplete="new-password"
            error={state?.fieldErrors?.password}
          />

          <SubmitButton pendingLabel="Criando conta..." className="w-full">
            Criar conta
          </SubmitButton>

          <p className="text-center text-sm text-slate-600">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
