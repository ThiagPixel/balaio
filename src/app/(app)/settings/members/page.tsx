import Link from "next/link";

import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { InvitationRevokeButton } from "./invitation-revoke-button";
import { InviteMemberForm } from "./invite-member-form";
import { MemberActiveButton } from "./member-active-button";
import { MemberPermissionsForm } from "./member-permissions-form";

export const dynamic = "force-dynamic";

type PermissionItem = {
  key: string;
  module: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type MemberItem = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "member";
  active: boolean;
  created_at: string;
  permissions: string[];
};

type MembersManagementData = {
  current_user_id: string;
  members: MemberItem[];
  permissions: PermissionItem[];
  can_manage_permissions: boolean;
  can_manage_active: boolean;
  can_invite: boolean;
};

type InvitationItem = {
  id: string;
  email: string;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "REVOKED"
    | "EXPIRED";
  permission_keys: string[];
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export default async function MembersPage() {
  await requirePagePermission(
    PERMISSIONS.MEMBERS_VIEW,
  );

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_members_management_data",
  );

  if (error) {
    console.error(
      "Erro ao carregar usuários:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Não foi possível carregar os usuários.",
    );
  }

  const managementData =
    data as MembersManagementData | null;

  if (!managementData) {
    throw new Error(
      "Os dados de usuários não foram encontrados.",
    );
  }

  const members =
    managementData.members ?? [];

  const permissions =
    managementData.permissions ?? [];

  let invitations: InvitationItem[] = [];

  if (managementData.can_invite) {
    const {
      data: invitationRows,
      error: invitationsError,
    } = await supabase.rpc(
      "list_member_invitations",
    );

    if (invitationsError) {
      console.error(
        "Erro ao carregar convites:",
        {
          code: invitationsError.code,
          message:
            invitationsError.message,
          details:
            invitationsError.details,
          hint: invitationsError.hint,
        },
      );

      throw new Error(
        "Não foi possível carregar os convites.",
      );
    }

    invitations =
      (invitationRows ??
        []) as InvitationItem[];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar para configurações
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Usuários e permissões
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Controle quem pode acessar cada
          área da empresa
        </p>
      </div>

      {managementData.can_invite && (
        <Card>
          <CardHeader>
            <CardTitle>
              Convidar funcionário
            </CardTitle>

            <CardDescription>
              Gere um link de acesso e
              escolha as permissões iniciais
              do usuário
            </CardDescription>
          </CardHeader>

          <CardContent>
            <InviteMemberForm
              permissions={permissions}
            />
          </CardContent>
        </Card>
      )}

      {managementData.can_invite &&
        invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Convites
              </CardTitle>

              <CardDescription>
                Convites recentes gerados
                para esta empresa
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {invitations.map(
                  (invitation) => {
                    const isPending =
                      invitation.status ===
                      "PENDING";

                    return (
                      <li
                        key={invitation.id}
                        className="flex flex-col gap-3 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {invitation.email}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Criado em{" "}
                            {formatDateTime(
                              invitation.created_at,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Expira em{" "}
                            {formatDateTime(
                              invitation.expires_at,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              invitation
                                .permission_keys
                                .length
                            }{" "}
                            permissão(ões)
                            selecionada(s)
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              isPending
                                ? "warning"
                                : invitation.status ===
                                    "ACCEPTED"
                                  ? "success"
                                  : "default"
                            }
                          >
                            {getInvitationStatusLabel(
                              invitation.status,
                            )}
                          </Badge>

                          {isPending && (
                            <InvitationRevokeButton
                              invitationId={
                                invitation.id
                              }
                            />
                          )}
                        </div>
                      </li>
                    );
                  },
                )}
              </ul>
            </CardContent>
          </Card>
        )}

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Usuários da empresa
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {members.length} usuário(s)
            vinculado(s)
          </p>
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-slate-500">
                Nenhum usuário encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {member.full_name ||
                        member.email}

                      {member.id ===
                        managementData.current_user_id && (
                        <span className="text-xs font-normal text-slate-500">
                          (você)
                        </span>
                      )}

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

                      <Badge
                        variant={
                          member.active
                            ? "success"
                            : "default"
                        }
                      >
                        {member.active
                          ? "Ativo"
                          : "Inativo"}
                      </Badge>
                    </CardTitle>

                    <CardDescription className="mt-1">
                      {member.email}
                    </CardDescription>
                  </div>

                  {member.role ===
                    "member" &&
                    managementData.can_manage_active && (
                      <MemberActiveButton
                        memberId={
                          member.id
                        }
                        active={
                          member.active
                        }
                      />
                    )}
                </div>
              </CardHeader>

              <CardContent>
                {member.role ===
                "owner" ? (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    O proprietário possui
                    acesso total e suas
                    permissões não podem ser
                    removidas.
                  </div>
                ) : (
                  <MemberPermissionsForm
                    member={member}
                    permissions={
                      permissions
                    }
                    canManage={
                      managementData.can_manage_permissions
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function getInvitationStatusLabel(
  status: InvitationItem["status"],
) {
  switch (status) {
    case "PENDING":
      return "Pendente";

    case "ACCEPTED":
      return "Aceito";

    case "EXPIRED":
      return "Expirado";

    case "REVOKED":
      return "Revogado";

    default:
      return status;
  }
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(new Date(value));
}