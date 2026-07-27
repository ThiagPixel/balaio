import Link from "next/link";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  getAccessContext,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

import { MovementForm } from "../new/movement-form";

export const dynamic = "force-dynamic";

type MovementType =
  | "IN"
  | "OUT"
  | "ADJUST";

export default async function NewMovementPage() {
  const access =
    await getAccessContext();

  const canCreateIn = can(
    access,
    PERMISSIONS.STOCK_IN,
  );

  const canCreateOut = can(
    access,
    PERMISSIONS.STOCK_OUT,
  );

  const canAdjust = can(
    access,
    PERMISSIONS.STOCK_ADJUST,
  );

  const allowedTypes: MovementType[] =
    [];

  if (canCreateIn) {
    allowedTypes.push("IN");
  }

  if (canCreateOut) {
    allowedTypes.push("OUT");
  }

  if (canAdjust) {
    allowedTypes.push("ADJUST");
  }

  if (allowedTypes.length === 0) {
    redirect("/forbidden");
  }

  const canViewCost = can(
    access,
    PERMISSIONS.PRODUCTS_VIEW_COST,
  );

  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "list_stock_products",
    );

  if (error) {
    console.error(
      "Erro ao carregar produtos para movimentação:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar os produtos.",
    );
  }

  const products = data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/stock"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar para movimentações
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Nova movimentação
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Registre uma entrada, saída ou ajuste
          de estoque
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            Não existem produtos ativos para
            movimentar.
          </p>

          <Link
            href="/products"
            className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voltar para produtos
          </Link>
        </div>
      ) : (
        <MovementForm
          products={products}
          allowedTypes={allowedTypes}
          canViewCost={canViewCost}
        />
      )}
    </div>
  );
}