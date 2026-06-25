"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { createMovement, type StockState } from "@/app/actions/stock";

interface ProductOpt {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

export function MovementForm({ products }: { products: ProductOpt[] }) {
  const [state, formAction] = useFormState<StockState, FormData>(
    createMovement,
    null,
  );
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const selected = products.find((p) => p.id === selectedId);

  const options = products.map((p) => ({
    value: p.id,
    label: `${p.name} (atual: ${p.current_stock} ${p.unit})`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da movimentação</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <Select
            name="product_id"
            label="Produto"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            options={options}
            required
          />

          <Select
            name="type"
            label="Tipo"
            defaultValue="IN"
            options={[
              { value: "IN", label: "Entrada (compra/devolução)" },
              { value: "OUT", label: "Saída (venda/consumo)" },
              { value: "ADJUST", label: "Ajuste (inventário)" },
            ]}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="quantity"
              type="number"
              step="1"
              label="Quantidade"
              required
              error={state?.fieldErrors?.quantity}
            />
            <Input
              name="unit_cost"
              type="number"
              step="0.01"
              min="0"
              label="Custo unitário (R$)"
              hint="Opcional, usado em entradas"
            />
          </div>

          {selected && (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Estoque atual:{" "}
              <strong>
                {selected.current_stock} {selected.unit}
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
