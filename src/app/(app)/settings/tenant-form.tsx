"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import {
  updateTenant,
  type TenantState,
} from "@/app/actions/tenant";
import { slugify } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type CompanySettings = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type TenantFormProps = {
  tenant: CompanySettings;
  canUpdate: boolean;
};

export function TenantForm({
  tenant,
  canUpdate,
}: TenantFormProps) {
  const [state, formAction] =
    useFormState<
      TenantState,
      FormData
    >(
      updateTenant,
      null,
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [name, setName] =
    useState(tenant.name);

  const [slug, setSlug] =
    useState(tenant.slug);

  const [slugDirty, setSlugDirty] =
    useState(false);

  function handleNameChange(
    value: string,
  ) {
    if (!canUpdate) {
      return;
    }

    setName(value);

    if (!slugDirty) {
      setSlug(
        slugify(value),
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dados da empresa
        </CardTitle>

        <CardDescription>
          Como sua empresa aparece no sistema
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          onSubmit={() => setIsSubmitting(true)}
        >
          {state?.error &&
            !state.fieldErrors && (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-700"
              >
                {state.error}
              </div>
            )}

          {state?.success && (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              {state.success}
            </div>
          )}

          {!canUpdate && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Você pode visualizar os dados,
              mas não possui permissão para
              alterá-los.
            </div>
          )}

          <Input
            name="name"
            label="Nome da empresa *"
            value={name}
            onChange={(event) =>
              handleNameChange(
                event.target.value,
              )
            }
            disabled={!canUpdate}
            required
            error={
              state?.fieldErrors?.name
            }
          />

          <Input
            name="slug"
            label="Identificador (slug)"
            value={slug}
            onChange={(event) => {
              if (!canUpdate) {
                return;
              }

              setSlug(
                event.target.value,
              );

              setSlugDirty(true);
            }}
            disabled={!canUpdate}
            hint="Usado em URLs e identificadores. Apenas letras minúsculas, números e hífens."
            error={
              state?.fieldErrors?.slug
            }
          />

          {canUpdate && (
            <div className="flex justify-end">
              <SubmitButton
                pendingLabel="Salvando..."
                disabled={isSubmitting}
              >
                Salvar alterações
              </SubmitButton>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}