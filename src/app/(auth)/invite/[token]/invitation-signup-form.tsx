"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import {
  signupWithInvitation,
  type AuthState,
} from "@/app/actions/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type InvitationSignupFormProps = {
  token: string;
  email: string;
  companyName: string;
};

export function InvitationSignupForm({
  token,
  email,
  companyName,
}: InvitationSignupFormProps) {
  const action =
    signupWithInvitation.bind(
      null,
      token,
    );

  const [state, formAction] =
    useFormState<
      AuthState,
      FormData
    >(
      action,
      null,
    );

  const success =
    state?.error?.startsWith(
      "Conta criada",
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Entrar na empresa
        </CardTitle>

        <CardDescription>
          Você foi convidado para fazer
          parte de {companyName}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
        >
          {state?.error &&
            !state.fieldErrors && (
              <div
                role="alert"
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
            name="invitedEmail"
            type="email"
            label="E-mail convidado"
            value={email}
            disabled
          />

          <Input
            name="fullName"
            type="text"
            label="Seu nome *"
            placeholder="João da Silva"
            required
            autoComplete="name"
            error={
              state?.fieldErrors
                ?.fullName
            }
          />

          <Input
            name="password"
            type="password"
            label="Senha *"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
            error={
              state?.fieldErrors
                ?.password
            }
          />

          <Input
            name="passwordConfirm"
            type="password"
            label="Confirmar senha *"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
            error={
              state?.fieldErrors
                ?.passwordConfirm
            }
          />

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            O acesso será criado para{" "}
            <strong>{email}</strong>. Não é
            possível aceitar o convite com
            outro endereço.
          </div>

          <SubmitButton
            pendingLabel="Criando acesso..."
            className="w-full"
          >
            Aceitar convite
          </SubmitButton>

          <p className="text-center text-sm text-slate-600">
            Já possui uma conta?{" "}
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