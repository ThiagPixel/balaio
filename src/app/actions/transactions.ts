"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  isPermissionDeniedError,
  requirePermission,
} from "@/lib/supabase/access";

export type TransactionStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED";

const transactionSchema = z.object({
  type: z.enum([
    "INCOME",
    "EXPENSE",
  ]),

  category: z
    .string()
    .trim()
    .min(
      1,
      "Categoria obrigatória",
    ),

  description: z
    .string()
    .trim()
    .min(
      1,
      "Descrição obrigatória",
    ),

  amount: z.coerce
    .number()
    .positive(
      "Valor deve ser maior que zero",
    ),

  due_date: z
    .string()
    .min(
      1,
      "Data de vencimento obrigatória",
    ),

  status: z
    .enum([
      "PENDING",
      "PAID",
      "CANCELLED",
    ])
    .default("PENDING"),

  paid_at: z
    .string()
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .optional()
    .nullable(),
});

export type TransactionState = {
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

function getStatusPermission(
  status: TransactionStatus,
) {
  switch (status) {
    case "PAID":
      return PERMISSIONS.FINANCE_SETTLE;

    case "PENDING":
      return PERMISSIONS.FINANCE_REOPEN;

    case "CANCELLED":
      return PERMISSIONS.FINANCE_CANCEL;
  }
}

export async function createTransaction(
  _prev: TransactionState,
  formData: FormData,
): Promise<TransactionState> {
  const raw = Object.fromEntries(
    formData.entries(),
  );

  const parsed =
    transactionSchema.safeParse({
      ...raw,

      paid_at:
        raw.paid_at || null,

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

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.FINANCE_CREATE,
      );

    const { error } =
      await supabase.rpc(
        "create_financial_transaction",
        {
          p_type:
            parsed.data.type,

          p_category:
            parsed.data.category,

          p_description:
            parsed.data.description,

          p_amount:
            parsed.data.amount,

          p_due_date:
            parsed.data.due_date,

          p_status:
            parsed.data.status,

          p_paid_at:
            parsed.data.paid_at,

          p_notes:
            parsed.data.notes,
        },
      );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "22023"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao criar lançamento:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível criar o lançamento.",
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
      "Erro inesperado ao criar lançamento:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao criar o lançamento.",
    };
  }

  revalidatePath("/financial");
  revalidatePath("/");

  redirect("/financial");
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
): Promise<TransactionState> {
  if (!id) {
    return {
      error:
        "Lançamento não informado.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        getStatusPermission(status),
      );

    const { error } =
      await supabase.rpc(
        "set_financial_transaction_status",
        {
          p_transaction_id: id,
          p_target_status: status,
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
        "Erro ao alterar status financeiro:",
        {
          transactionId: id,
          status,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível alterar o status.",
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
      "Erro inesperado ao alterar status:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao alterar o status.",
    };
  }

  revalidatePath("/financial");
  revalidatePath("/");

  return {
    success:
      status === "PAID"
        ? "Lançamento marcado como pago."
        : status === "PENDING"
          ? "Lançamento reaberto."
          : "Lançamento cancelado.",
  };
}

export async function deleteTransaction(
  id: string,
): Promise<TransactionState> {
  if (!id) {
    return {
      error:
        "Lançamento não informado.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.FINANCE_DELETE,
      );

    const { error } =
      await supabase.rpc(
        "delete_financial_transaction",
        {
          p_transaction_id: id,
        },
      );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "P0002"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao excluir lançamento:",
        {
          transactionId: id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível excluir o lançamento.",
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
      "Erro inesperado ao excluir lançamento:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao excluir o lançamento.",
    };
  }

  revalidatePath("/financial");
  revalidatePath("/");

  return {
    success:
      "Lançamento excluído.",
  };
}