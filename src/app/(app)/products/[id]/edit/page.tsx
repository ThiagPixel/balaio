import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/supabase/tenant";
import { ProductForm } from "../../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireTenant();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

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
        <p className="mt-1 text-sm text-slate-500">{product.name}</p>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
