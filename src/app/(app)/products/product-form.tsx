"use client";

import { useFormState } from "react-dom";

import {
  createProduct,
  updateProduct,
  type ProductState,
} from "@/app/actions/products";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

type ProductFormProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  cost_price: number | string | null;
  sale_price: number | string;
  min_stock: number;
  current_stock: number;
};

type ProductFormProps = {
  product?: ProductFormProduct;
  canViewCost: boolean;
};

export function ProductForm({
  product,
  canViewCost,
}: ProductFormProps) {
  const action = product
    ? (
        state: ProductState,
        formData: FormData,
      ) =>
        updateProduct(
          product.id,
          state,
          formData,
        )
    : createProduct;

  const [state, formAction] =
    useFormState<ProductState, FormData>(
      action,
      null,
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {product
            ? "Editar produto"
            : "Dados do produto"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
        >
          {state?.error &&
            !state.fieldErrors && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

          {state?.success && (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              {state.success}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="name"
              label="Nome *"
              defaultValue={product?.name}
              required
              error={
                state?.fieldErrors?.name
              }
            />

            <Input
              name="sku"
              label="SKU"
              hint="Opcional, único na empresa"
              defaultValue={
                product?.sku ?? ""
              }
              error={
                state?.fieldErrors?.sku
              }
            />
          </div>

          <Textarea
            name="description"
            label="Descrição"
            rows={3}
            defaultValue={
              product?.description ?? ""
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="unit"
              label="Unidade"
              defaultValue={
                product?.unit ?? "un"
              }
              hint="Ex: un, kg, m, L"
              error={
                state?.fieldErrors?.unit
              }
            />

            <Input
              name="current_stock"
              type="number"
              step="1"
              min="0"
              label={
                product
                  ? "Estoque atual"
                  : "Estoque inicial"
              }
              defaultValue={
                product?.current_stock ??
                0
              }
              disabled={Boolean(product)}
              hint={
                product
                  ? "Use movimentações para alterar"
                  : undefined
              }
              error={
                state?.fieldErrors
                  ?.current_stock
              }
            />
          </div>

          <div
            className={
              canViewCost
                ? "grid gap-4 sm:grid-cols-3"
                : "grid gap-4 sm:grid-cols-2"
            }
          >
            {canViewCost && (
              <Input
                name="cost_price"
                type="number"
                step="0.01"
                min="0"
                label="Preço de custo (R$)"
                defaultValue={
                  product?.cost_price ?? 0
                }
                error={
                  state?.fieldErrors
                    ?.cost_price
                }
              />
            )}

            <Input
              name="sale_price"
              type="number"
              step="0.01"
              min="0"
              label="Preço de venda (R$)"
              defaultValue={
                product?.sale_price ?? 0
              }
              error={
                state?.fieldErrors
                  ?.sale_price
              }
            />

            <Input
              name="min_stock"
              type="number"
              step="1"
              min="0"
              label="Estoque mínimo"
              hint="Alerta quando atingido"
              defaultValue={
                product?.min_stock ?? 0
              }
              error={
                state?.fieldErrors
                  ?.min_stock
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <SubmitButton pendingLabel="Salvando...">
              {product
                ? "Salvar alterações"
                : "Criar produto"}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}