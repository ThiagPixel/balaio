"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateTenant, type TenantState } from "@/app/actions/tenant";
import { slugify } from "@/lib/utils";
import type { Tenant } from "@/types/database";

export function TenantForm({ tenant }: { tenant: Tenant | null }) {
  const [state, formAction] = useFormState<TenantState, FormData>(
    updateTenant,
    null,
  );
  const [name, setName] = useState(tenant?.name ?? "");
  const [slug, setSlug] = useState(tenant?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugDirty) setSlug(slugify(v));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da empresa</CardTitle>
        <CardDescription>Como sua empresa aparece no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              {state.success}
            </div>
          )}

          <Input
            name="name"
            label="Nome da empresa *"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            error={state?.fieldErrors?.name}
          />

          <Input
            name="slug"
            label="Identificador (slug)"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            hint="Usado em URLs e identificadores. Apenas letras minúsculas, números e hífens."
            error={state?.fieldErrors?.slug}
          />

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Salvando...">
              Salvar alterações
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
