import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LogoutButton } from "@/components/layout/logout-button";

export const dynamic =
  "force-dynamic";

export default function AccountDisabledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            🔒
          </div>

          <CardTitle>
            Acesso indisponível
          </CardTitle>

          <CardDescription>
            Sua conta está desativada ou não
            possui mais um vínculo válido com
            a empresa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Entre em contato com o
            proprietário ou administrador da
            empresa para solicitar a
            reativação do seu acesso.
          </div>

          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}