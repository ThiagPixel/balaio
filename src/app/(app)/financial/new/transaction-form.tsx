"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createTransaction,
  type TransactionState,
} from "@/app/actions/transactions";

const CATEGORIES = [
  "Vendas",
  "Serviços",
  "Fornecedores",
  "Salários",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Impostos",
  "Marketing",
  "Manutenção",
  "Outros",
];

export function TransactionForm() {
  const [state, formAction] = useFormState<TransactionState, FormData>(
    createTransaction,
    null,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do lançamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && !state.fieldErrors && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <Select
            name="type"
            label="Tipo"
            defaultValue="EXPENSE"
            options={[
              { value: "INCOME", label: "A receber (receita)" },
              { value: "EXPENSE", label: "A pagar (despesa)" },
            ]}
            required
          />

          <Input
            name="description"
            label="Descrição *"
            placeholder="Ex: Venda #123, Conta de luz..."
            required
            error={state?.fieldErrors?.description}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              name="category"
              label="Categoria *"
              defaultValue="Outros"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              required
            />
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label="Valor (R$) *"
              required
              error={state?.fieldErrors?.amount}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="due_date"
              type="date"
              label="Vencimento *"
              defaultValue={today}
              required
              error={state?.fieldErrors?.due_date}
            />
            <Select
              name="status"
              label="Status"
              defaultValue="PENDING"
              options={[
                { value: "PENDING", label: "Pendente" },
                { value: "PAID", label: "Já pago" },
                { value: "CANCELLED", label: "Cancelado" },
              ]}
            />
          </div>

          <Textarea
            name="notes"
            label="Observação"
            rows={2}
            placeholder="Detalhes extras, número da NF, etc."
          />

          <div className="flex justify-end gap-3 pt-4">
            <SubmitButton pendingLabel="Salvando...">
              Criar lançamento
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
