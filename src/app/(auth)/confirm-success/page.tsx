import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConfirmSuccessPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-7 w-7 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <CardTitle>Email confirmado com sucesso!</CardTitle>
        <CardDescription>
          Sua conta está ativada e pronta para usar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Você já pode acessar sua empresa e começar a gerenciar estoque e
          finanças.
        </p>
        <Link
          href="/dashboard"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Ir para o Dashboard
        </Link>
        <p className="text-center text-xs text-slate-500">
          Ou{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            faça login aqui
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
