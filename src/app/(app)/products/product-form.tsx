"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createProduct,
  updateProduct,
  type ProductState,
} from "@/app/actions/products";
import type { Product } from "@/types/database";

export function ProductForm({ product }: { product?: Product }) {
  const action = product
    ? (state: ProductState, fd: FormData) =>
        updateProduct(product.id, state, fd)
    : createProduct;

  const [state, formAction] = useFormState<ProductState, FormData>(
    action,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Editar produto" : "Dados do produto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="name"
              label="Nome *"
              defaultValue={product?.name}
              required
              error={state?.fieldErrors?.name}
            />
            <Input
              name="sku"
              label="SKU"
              hint="Opcional, único na empresa"
              defaultValue={product?.sku ?? ""}
              error={state?.fieldErrors?.sku}
            />
          </div>

          <Textarea
            name="description"
            label="Descrição"
            rows={3}
            defaultValue={product?.description ?? ""}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="unit"
              label="Unidade"
              defaultValue={product?.unit ?? "un"}
              hint="Ex: un, kg, m, L"
            />
            <Input
              name="current_stock"
              type="number"
              step="1"
              min="0"
              label="Estoque inicial"
              defaultValue={product?.current_stock ?? 0}
              disabled={!!product}
              hint={product ? "Use movimentações para alterar" : undefined}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              label="Preço de custo (R$)"
              defaultValue={product?.cost_price ?? 0}
            />
            <Input
              name="sale_price"
              type="number"
              step="0.01"
              min="0"
              label="Preço de venda (R$)"
              defaultValue={product?.sale_price ?? 0}
            />
            <Input
              name="min_stock"
              type="number"
              step="1"
              min="0"
              label="Estoque mínimo"
              hint="Alerta quando atingido"
              defaultValue={product?.min_stock ?? 0}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <SubmitButton pendingLabel="Salvando...">
              {product ? "Salvar alterações" : "Criar produto"}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
