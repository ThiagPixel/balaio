"use client";

import {
  useFormState,
} from "react-dom";
import {
  useMemo,
  useState,
} from "react";

import {
  createMovement,
  type StockState,
} from "@/app/actions/stock";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

type MovementType =
  | "IN"
  | "OUT"
  | "ADJUST";

interface ProductOpt {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

type MovementFormProps = {
  products: ProductOpt[];
  allowedTypes: MovementType[];
  canViewCost: boolean;
};

const TYPE_OPTIONS: Record<
  MovementType,
  string
> = {
  IN: "Entrada (compra/devolução)",
  OUT: "Saída (venda/consumo)",
  ADJUST: "Ajuste (inventário)",
};

export function MovementForm({
  products,
  allowedTypes,
  canViewCost,
}: MovementFormProps) {
  const [state, formAction] =
    useFormState<StockState, FormData>(
      createMovement,
      null,
    );

  const [selectedId, setSelectedId] =
    useState(
      products[0]?.id ?? "",
    );

  const [selectedType, setSelectedType] =
    useState<MovementType>(
      allowedTypes[0] ?? "IN",
    );

  const selected = products.find(
    (product) =>
      product.id === selectedId,
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,

        label: `${product.name} (atual: ${product.current_stock} ${product.unit})`,
      })),

    [products],
  );

  const typeOptions = allowedTypes.map(
    (type) => ({
      value: type,
      label: TYPE_OPTIONS[type],
    }),
  );

  const isAdjustment =
    selectedType === "ADJUST";

  const showUnitCost =
    selectedType === "IN" &&
    canViewCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dados da movimentação
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

          <Select
            name="product_id"
            label="Produto"
            value={selectedId}
            onChange={(event) =>
              setSelectedId(
                event.target.value,
              )
            }
            options={productOptions}
            required
          />

          {state?.fieldErrors
            ?.product_id && (
            <p className="-mt-3 text-xs text-red-600">
              {
                state.fieldErrors
                  .product_id
              }
            </p>
          )}

          <Select
            name="type"
            label="Tipo"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(
                event.target
                  .value as MovementType,
              )
            }
            options={typeOptions}
            required
          />

          <div
            className={
              showUnitCost
                ? "grid gap-4 sm:grid-cols-2"
                : "grid gap-4"
            }
          >
            <Input
              name="quantity"
              type="number"
              step="1"
              min={
                isAdjustment
                  ? "0"
                  : "1"
              }
              label={
                isAdjustment
                  ? "Novo estoque"
                  : "Quantidade"
              }
              hint={
                isAdjustment
                  ? "Informe a quantidade total que deverá permanecer no estoque"
                  : undefined
              }
              required
              error={
                state?.fieldErrors
                  ?.quantity
              }
            />

            {showUnitCost && (
              <Input
                name="unit_cost"
                type="number"
                step="0.01"
                min="0"
                label="Custo unitário (R$)"
                hint="Opcional, usado em entradas"
                error={
                  state?.fieldErrors
                    ?.unit_cost
                }
              />
            )}
          </div>

          {selected && (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Estoque atual:{" "}
              <strong>
                {
                  selected.current_stock
                }{" "}
                {selected.unit}
              </strong>
            </p>
          )}

          <Textarea
            name="notes"
            label="Observação"
            rows={2}
            placeholder="Motivo, fornecedor, etc."
          />

          <div className="flex justify-end gap-3 pt-4">
            <SubmitButton pendingLabel="Salvando...">
              Registrar movimentação
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}