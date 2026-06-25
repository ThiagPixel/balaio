import Link from "next/link";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
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
      <ProductForm />
    </div>
  );
}
