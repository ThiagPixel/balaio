import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/supabase/tenant";
import { MovementForm } from "./movement-form";

export const dynamic = "force-dynamic";

export default async function NewMovementPage() {
  const { supabase } = await requireTenant();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit, current_stock, active")
    .eq("active", true)
    .order("name");

  if (!products || products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/stock"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Nova movimentação
          </h1>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Você precisa cadastrar produtos antes de criar movimentações.
          </p>
          <Link
            href="/products/new"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            + Cadastrar produto
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/stock"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Nova movimentação
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registre uma entrada, saída ou ajuste de estoque
        </p>
      </div>
      <MovementForm products={products} />
    </div>
  );
}
