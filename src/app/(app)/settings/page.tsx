import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  requirePagePermission,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { TenantForm } from "./tenant-form";
import Link from "next/dist/client/link";

export const dynamic = "force-dynamic";

type CompanySettings = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type TenantMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "member";
  active: boolean;
  created_at: string;
  permissions?: string[];
};

export default async function SettingsPage() {
  const access =
    await requirePagePermission(
      PERMISSIONS.SETTINGS_VIEW,
    );

  const canUpdate = can(
    access,
    PERMISSIONS.SETTINGS_UPDATE,
  );

  const canViewMembers = can(
    access,
    PERMISSIONS.MEMBERS_VIEW,
  );

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: companyRows,
    error: companyError,
  } = await supabase.rpc(
    "get_company_settings",
  );

  if (companyError) {
    console.error(
      "Erro ao carregar configurações:",
      {
        code: companyError.code,
        message: companyError.message,
        details: companyError.details,
        hint: companyError.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar as configurações.",
    );
  }

  const tenant =
    companyRows?.[0] as
      | CompanySettings
      | undefined;

  if (!tenant) {
    throw new Error(
      "Empresa não encontrada.",
    );
  }

  let members: TenantMember[] = [];

  if (canViewMembers) {
    const {
      data: memberRows,
      error: membersError,
    } = await supabase.rpc(
      "list_tenant_members",
    );

    if (membersError) {
      console.error(
        "Erro ao carregar membros:",
        {
          code: membersError.code,
          message:
            membersError.message,
          details:
            membersError.details,
          hint:
            membersError.hint,
        },
      );

      throw new Error(
        "Não foi possível carregar os usuários.",
      );
    }

    members =
      (memberRows ??
        []) as TenantMember[];
  }

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

      <TenantForm
        tenant={tenant}
        canUpdate={canUpdate}
      />

      {canViewMembers && (
        <Card>
          <CardHeader>
            <CardTitle>
              Usuários
            </CardTitle>

            <CardDescription>
              {members.length} usuário(s)
              vinculado(s) a esta empresa
            </CardDescription>
          </CardHeader>

          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.full_name ||
                          member.email}

                        {member.id ===
                          user.id && (
                          <span className="ml-2 text-xs text-slate-500">
                            (você)
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-slate-500">
                        {member.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          member.role ===
                          "owner"
                            ? "info"
                            : "default"
                        }
                      >
                        {member.role ===
                        "owner"
                          ? "Proprietário"
                          : "Membro"}
                      </Badge>

                      {!member.active && (
                        <Badge variant="default">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-xs text-slate-500">
              O gerenciamento completo de
              usuários e convites será feito
              na próxima etapa.
            </p>
          </CardContent>
        </Card>
      )}
        {canViewMembers && (
      <Link
        href="/settings/members"
        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Gerenciar usuários e permissões
      </Link>
    )}
    </div>
  );
}