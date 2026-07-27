"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  isPermissionDeniedError,
  requirePermission,
} from "@/lib/supabase/access";

const movementSchema = z
  .object({
    product_id: z
      .string()
      .uuid("Produto inválido"),

    type: z.enum([
      "IN",
      "OUT",
      "ADJUST",
    ]),

    quantity: z.coerce
      .number()
      .int(
        "A quantidade deve ser um número inteiro",
      ),

    unit_cost: z.preprocess(
      (value) => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return null;
        }

        return value;
      },
      z.coerce
        .number()
        .min(
          0,
          "O custo não pode ser negativo",
        )
        .nullable(),
    ),

    notes: z
      .string()
      .trim()
      .optional()
      .nullable(),
  })
  .superRefine((data, context) => {
    if (
      data.type === "IN" ||
      data.type === "OUT"
    ) {
      if (data.quantity <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message:
            "A quantidade deve ser maior que zero",
        });
      }

      return;
    }

    if (data.quantity < 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message:
          "O novo estoque não pode ser negativo",
      });
    }
  });

export type StockState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<
    string,
    string
  >;
} | null;

function getPermissionForMovement(
  type: "IN" | "OUT" | "ADJUST",
) {
  switch (type) {
    case "IN":
      return PERMISSIONS.STOCK_IN;

    case "OUT":
      return PERMISSIONS.STOCK_OUT;

    case "ADJUST":
      return PERMISSIONS.STOCK_ADJUST;
  }
}

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

export async function createMovement(
  _prev: StockState,
  formData: FormData,
): Promise<StockState> {
  const raw = Object.fromEntries(
    formData.entries(),
  );

  const parsed =
    movementSchema.safeParse({
      ...raw,

      unit_cost:
        raw.unit_cost || null,

      notes:
        typeof raw.notes === "string" &&
        raw.notes.trim()
          ? raw.notes.trim()
          : null,
    });

  if (!parsed.success) {
    return {
      error: "Verifique os campos",
      fieldErrors: getFieldErrors(
        parsed.error.errors,
      ),
    };
  }

  const data = parsed.data;

  try {
    /*
     * Validação antecipada no Next.js.
     *
     * A RPC também valida novamente no banco.
     */
    const { supabase } =
      await requirePermission(
        getPermissionForMovement(
          data.type,
        ),
      );

    const { error } = await supabase.rpc(
      "execute_stock_movement",
      {
        p_product_id:
          data.product_id,

        p_type:
          data.type,

        p_quantity:
          data.quantity,

        p_unit_cost:
          data.type === "IN"
            ? data.unit_cost
            : null,

        p_notes:
          data.notes,
      },
    );

    if (error) {
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
        "Erro ao registrar movimentação:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível registrar a movimentação.",
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
      "Erro inesperado ao registrar movimentação:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao registrar a movimentação.",
    };
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/");

  redirect("/stock");
}