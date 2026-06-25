import { requireTenant } from "@/lib/supabase/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantForm } from "./tenant-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user, tenantId } = await requireTenant();
  if (!tenantId) redirect("/login");

  const [{ data: tenant }, { data: members }] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase
      .from("users")
      .select("id, email, full_name, role, active, created_at")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Dados da empresa e usuários
        </p>
      </div>

      <TenantForm tenant={tenant} />

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            {members?.length ?? 0} usuário(s) vinculado(s) a esta empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!members || members.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum usuário encontrado.</p>
          ) : (
            <ul className="space-y-3">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.full_name || m.email}
                      {m.id === user.id && (
                        <span className="ml-2 text-xs text-slate-500">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={m.role === "owner" ? "info" : "default"}
                    >
                      {m.role === "owner" ? "Proprietário" : "Membro"}
                    </Badge>
                    {!m.active && <Badge variant="default">Inativo</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">
            💡 No MVP, o convite de novos usuários é feito pelo suporte.
            Convidaremos usuários adicionando-os manualmente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona o multi-tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            ✅ Cada empresa (tenant) tem seus dados isolados por
            <strong> Row Level Security (RLS) </strong>
            no Supabase.
          </p>
          <p>
            ✅ Cada usuário carrega o <code className="rounded bg-slate-100 px-1">tenant_id</code> no
            token JWT, garantindo que as policies do banco filtrem automaticamente.
          </p>
          <p>
            ✅ Para criar uma nova empresa, basta fazer logout e usar
            &quot;Criar empresa&quot; na tela de login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
