"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import {
  createTransaction,
  type TransactionState,
} from "@/app/actions/transactions";

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

type TransactionStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED";

type TransactionFormProps = {
  canSettle: boolean;
  canCancel: boolean;
};

export function TransactionForm({
  canSettle,
  canCancel,
}: TransactionFormProps) {
  const [state, formAction] =
    useFormState<
      TransactionState,
      FormData
    >(
      createTransaction,
      null,
    );

  const [status, setStatus] =
    useState<TransactionStatus>(
      "PENDING",
    );

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const statusOptions = [
    {
      value: "PENDING",
      label: "Pendente",
    },

    ...(canSettle
      ? [
          {
            value: "PAID",
            label: "Já pago",
          },
        ]
      : []),

    ...(canCancel
      ? [
          {
            value: "CANCELLED",
            label: "Cancelado",
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dados do lançamento
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
        >
          {state?.error &&
            !state.fieldErrors && (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-700"
              >
                {state.error}
              </div>
            )}

          <Select
            name="type"
            label="Tipo"
            defaultValue="EXPENSE"
            options={[
              {
                value: "INCOME",
                label:
                  "A receber (receita)",
              },
              {
                value: "EXPENSE",
                label:
                  "A pagar (despesa)",
              },
            ]}
            required
          />

          {state?.fieldErrors?.type && (
            <p className="-mt-3 text-xs text-red-600">
              {state.fieldErrors.type}
            </p>
          )}

          <Input
            name="description"
            label="Descrição *"
            placeholder="Ex: Venda #123, Conta de luz..."
            required
            error={
              state?.fieldErrors
                ?.description
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Select
                name="category"
                label="Categoria *"
                defaultValue="Outros"
                options={CATEGORIES.map(
                  (category) => ({
                    value: category,
                    label: category,
                  }),
                )}
                required
              />

              {state?.fieldErrors
                ?.category && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    state.fieldErrors
                      .category
                  }
                </p>
              )}
            </div>

            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label="Valor (R$) *"
              required
              error={
                state?.fieldErrors
                  ?.amount
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="due_date"
              type="date"
              label="Vencimento *"
              defaultValue={today}
              required
              error={
                state?.fieldErrors
                  ?.due_date
              }
            />

            <div>
              <Select
                name="status"
                label="Status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as TransactionStatus,
                  )
                }
                options={
                  statusOptions
                }
                required
              />

              {state?.fieldErrors
                ?.status && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    state.fieldErrors
                      .status
                  }
                </p>
              )}
            </div>
          </div>

          {status === "PAID" && (
            <Input
              name="paid_at"
              type="date"
              label="Data do pagamento"
              defaultValue={today}
              error={
                state?.fieldErrors
                  ?.paid_at
              }
            />
          )}

          {status === "CANCELLED" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              O lançamento será criado
              como cancelado e não será
              considerado como pago.
            </div>
          )}

          <Textarea
            name="notes"
            label="Observação"
            rows={2}
            placeholder="Detalhes extras, número da NF, etc."
          />

          {state?.fieldErrors?.notes && (
            <p className="-mt-3 text-xs text-red-600">
              {state.fieldErrors.notes}
            </p>
          )}

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