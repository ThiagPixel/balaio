import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

import { ProductForm } from "../../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /**
   * Para acessar a edição, o usuário precisa poder editar.
   */
  const access = await requirePagePermission(
    PERMISSIONS.PRODUCTS_UPDATE,
  );

  /**
   * get_product também exige products.view.
   */
  if (
    !can(
      access,
      PERMISSIONS.PRODUCTS_VIEW,
    )
  ) {
    redirect("/forbidden");
  }

  const canViewCost = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW_COST,
  );

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_product",
    {
      p_product_id: id,
    },
  );

  if (error) {
    console.error(
      "Erro ao carregar produto para edição:",
      {
        productId: id,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar o produto.",
    );
  }

  /**
   * get_product retorna uma tabela, portanto o Supabase
   * devolve um array.
   */
  const product = data?.[0];

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/products"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar para produtos
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Editar produto
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {product.name}
        </p>
      </div>

      <ProductForm
        product={product}
        canViewCost={canViewCost}
      />
    </div>
  );
}