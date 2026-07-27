"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  isPermissionDeniedError,
  requirePermission,
} from "@/lib/supabase/access";

const tenantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "O nome deve possuir pelo menos 2 caracteres",
    )
    .max(
      120,
      "O nome deve possuir no máximo 120 caracteres",
    ),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(
      2,
      "O identificador deve possuir pelo menos 2 caracteres",
    )
    .max(
      63,
      "O identificador deve possuir no máximo 63 caracteres",
    )
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens",
    ),
});

export type TenantState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<
    string,
    string
  >;
} | null;

function getFieldErrors(
  issues: z.ZodIssue[],
) {
  const fieldErrors: Record<
    string,
    string
  > = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field === "string") {
      fieldErrors[field] =
        issue.message;
    }
  }

  return fieldErrors;
}

export async function updateTenant(
  _previousState: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const parsed =
    tenantSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });

  if (!parsed.success) {
    return {
      error: "Verifique os campos",
      fieldErrors: getFieldErrors(
        parsed.error.errors,
      ),
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.SETTINGS_UPDATE,
      );

    const { error } =
      await supabase.rpc(
        "update_company_settings",
        {
          p_name: parsed.data.name,
          p_slug: parsed.data.slug,
        },
      );

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "Este identificador já está sendo utilizado por outra empresa.",
          fieldErrors: {
            slug:
              "Escolha outro identificador.",
          },
        };
      }

      if (
        error.code === "42501" ||
        error.code === "22023" ||
        error.code === "P0002"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao atualizar empresa:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível atualizar os dados da empresa.",
      };
    }
  } catch (error) {
    if (
      isPermissionDeniedError(error)
    ) {
      return {
        error: error.message,
      };
    }

    console.error(
      "Erro inesperado ao atualizar empresa:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao atualizar a empresa.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/");

  return {
    success:
      "Dados da empresa atualizados.",
  };
}