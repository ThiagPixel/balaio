import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";

import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  /**
   * Digitar /products/new diretamente não contorna
   * a verificação de permissão.
   */
  const access = await requirePagePermission(
    PERMISSIONS.PRODUCTS_CREATE,
  );

  const canViewCost = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW_COST,
  );

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
          Novo produto
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Cadastre um novo produto no estoque
        </p>
      </div>

      <ProductForm canViewCost={canViewCost} />
    </div>
  );
}