"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  isPermissionDeniedError,
  requirePermission,
} from "@/lib/supabase/access";

/**
 * Campos comuns entre criação e atualização.
 *
 * current_stock não está aqui porque produtos existentes
 * só podem ter estoque alterado por movimentações.
 */
const productBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório"),

  sku: z
    .string()
    .trim()
    .optional()
    .nullable(),

  description: z
    .string()
    .trim()
    .optional()
    .nullable(),

  unit: z
    .string()
    .trim()
    .min(
      1,
      "Unidade obrigatória",
    )
    .default("un"),

  sale_price: z.coerce
    .number()
    .min(
      0,
      "O preço de venda não pode ser negativo",
    )
    .default(0),

  min_stock: z.coerce
    .number()
    .int(
      "O estoque mínimo deve ser inteiro",
    )
    .min(
      0,
      "O estoque mínimo não pode ser negativo",
    )
    .default(0),
});

const requiredCostPriceSchema =
  z.coerce
    .number()
    .min(
      0,
      "O preço de custo não pode ser negativo",
    )
    .default(0);

/**
 * Na edição, custo é opcional.
 *
 * Quando o campo não for enviado, o valor atual do banco
 * deve ser mantido.
 */
const optionalCostPriceSchema =
  z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      return value;
    },

    z.coerce
      .number()
      .min(
        0,
        "O preço de custo não pode ser negativo",
      )
      .optional(),
  );

const createProductSchema =
  productBaseSchema.extend({
    cost_price:
      requiredCostPriceSchema,

    current_stock: z.coerce
      .number()
      .int(
        "O estoque inicial deve ser inteiro",
      )
      .min(
        0,
        "O estoque inicial não pode ser negativo",
      )
      .default(0),
  });

const updateProductSchema =
  productBaseSchema.extend({
    cost_price:
      optionalCostPriceSchema,
  });

export type ProductState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<
    string,
    string
  >;
} | null;

function normalizeProductFormData(
  formData: FormData,
) {
  const raw = Object.fromEntries(
    formData.entries(),
  );

  return {
    ...raw,

    sku:
      typeof raw.sku === "string" &&
      raw.sku.trim()
        ? raw.sku.trim()
        : null,

    description:
      typeof raw.description ===
        "string" &&
      raw.description.trim()
        ? raw.description.trim()
        : null,
  };
}

function getFieldErrors(
  errors: z.ZodIssue[],
): Record<string, string> {
  const fieldErrors: Record<
    string,
    string
  > = {};

  for (const error of errors) {
    const field = error.path[0];

    if (typeof field === "string") {
      fieldErrors[field] =
        error.message;
    }
  }

  return fieldErrors;
}

function handlePermissionError(
  error: unknown,
): ProductState | undefined {
  if (
    isPermissionDeniedError(error)
  ) {
    return {
      error: error.message,
    };
  }

  return undefined;
}

/**
 * Verifica no banco se o usuário pode visualizar e,
 * nesta primeira versão, administrar preços de custo.
 *
 * Isso impede que alguém apenas esconda o campo no frontend
 * e envie cost_price manualmente.
 */
/* async function canManageProductCost(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: allowed,
    error,
  } = await supabase.rpc(
    "has_permission",
    {
      p_permission_key:
        PERMISSIONS.PRODUCTS_VIEW_COST,
    },
  );

  if (error) {
    console.error(
      "Erro ao verificar permissão de custo:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível validar a permissão de custo.",
    );
  }

  return allowed === true;
} */

export async function createProduct(
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const parsed =
    createProductSchema.safeParse(
      normalizeProductFormData(formData),
    );

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
        PERMISSIONS.PRODUCTS_CREATE,
      );

    const { error } = await supabase.rpc(
      "create_product",
      {
        p_name: parsed.data.name,
        p_sku: parsed.data.sku,
        p_description:
          parsed.data.description,
        p_unit: parsed.data.unit,
        p_cost_price:
          parsed.data.cost_price,
        p_sale_price:
          parsed.data.sale_price,
        p_min_stock:
          parsed.data.min_stock,
        p_current_stock:
          parsed.data.current_stock,
      },
    );

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "Já existe um produto com este SKU.",
        };
      }

      if (
        error.code === "42501" ||
        error.code === "22023"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao criar produto:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível criar o produto.",
      };
    }
  } catch (error) {
    const permissionError =
      handlePermissionError(error);

    if (permissionError) {
      return permissionError;
    }

    console.error(
      "Erro inesperado ao criar produto:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao criar o produto.",
    };
  }

  revalidatePath("/products");
  revalidatePath("/");

  redirect("/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  if (!id) {
    return {
      error: "Produto não informado.",
    };
  }

  const parsed =
    updateProductSchema.safeParse(
      normalizeProductFormData(formData),
    );

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
        PERMISSIONS.PRODUCTS_UPDATE,
      );

    const { error } = await supabase.rpc(
      "update_product",
      {
        p_product_id: id,
        p_name: parsed.data.name,
        p_sku: parsed.data.sku,
        p_description:
          parsed.data.description,
        p_unit: parsed.data.unit,
        p_sale_price:
          parsed.data.sale_price,
        p_min_stock:
          parsed.data.min_stock,
        p_cost_price:
          parsed.data.cost_price ??
          null,
      },
    );

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "Já existe um produto com este SKU.",
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
        "Erro ao editar produto:",
        {
          productId: id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível editar o produto.",
      };
    }
  } catch (error) {
    const permissionError =
      handlePermissionError(error);

    if (permissionError) {
      return permissionError;
    }

    console.error(
      "Erro inesperado ao editar produto:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao editar o produto.",
    };
  }

  revalidatePath("/products");
  revalidatePath(
    `/products/${id}/edit`,
  );
  revalidatePath("/");

  redirect("/products");
}

export async function toggleProductActive(
  id: string,
  active: boolean,
): Promise<ProductState> {
  if (!id) {
    return {
      error: "Produto não informado.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.PRODUCTS_TOGGLE_ACTIVE,
      );

    const { error } = await supabase.rpc(
      "set_product_active",
      {
        p_product_id: id,
        p_active: active,
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
        "Erro ao alterar status do produto:",
        {
          productId: id,
          active,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível alterar o status do produto.",
      };
    }
  } catch (error) {
    const permissionError =
      handlePermissionError(error);

    if (permissionError) {
      return permissionError;
    }

    console.error(
      "Erro inesperado ao alterar produto:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao alterar o produto.",
    };
  }

  revalidatePath("/products");
  revalidatePath("/");

  return {
    success: active
      ? "Produto ativado."
      : "Produto desativado.",
  };
}

export async function deleteProduct(
  id: string,
): Promise<ProductState> {
  if (!id) {
    return {
      error: "Produto não informado.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.PRODUCTS_DELETE,
      );

    const { error } = await supabase.rpc(
      "delete_product",
      {
        p_product_id: id,
      },
    );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "P0002" ||
        error.code === "23503"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao excluir produto:",
        {
          productId: id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível excluir o produto.",
      };
    }
  } catch (error) {
    const permissionError =
      handlePermissionError(error);

    if (permissionError) {
      return permissionError;
    }

    console.error(
      "Erro inesperado ao excluir produto:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao excluir o produto.",
    };
  }

  revalidatePath("/products");
  revalidatePath("/");

  return {
    success: "Produto excluído.",
  };
}