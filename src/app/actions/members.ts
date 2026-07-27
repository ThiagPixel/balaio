"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  isPermissionDeniedError,
  requirePermission,
} from "@/lib/supabase/access";

const memberIdSchema = z
  .string()
  .uuid("Usuário inválido");

const invitationIdSchema = z
  .string()
  .uuid("Convite inválido");

const invitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido"),
});

export type MemberActionState = {
  error?: string;
  success?: string;
} | null;

export type InvitationActionState = {
  error?: string;
  success?: string;

  fieldErrors?: {
    email?: string;
  };

  invitePath?: string;
} | null;

export async function saveMemberPermissions(
  memberId: string,
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsedId =
    memberIdSchema.safeParse(memberId);

  if (!parsedId.success) {
    return {
      error: "Usuário inválido.",
    };
  }

  const permissionKeys = formData
    .getAll("permissions")
    .filter(
      (value): value is string =>
        typeof value === "string",
    );

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.MEMBERS_PERMISSIONS,
      );

    const { error } = await supabase.rpc(
      "update_member_permissions",
      {
        p_member_id: parsedId.data,
        p_permission_keys:
          permissionKeys,
      },
    );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "22023" ||
        error.code === "P0002"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao atualizar permissões:",
        {
          memberId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível atualizar as permissões.",
      };
    }
  } catch (error) {
    if (
      isPermissionDeniedError(error)
    ) {
      return {
        error: error.message,
      };
    }

    console.error(
      "Erro inesperado ao atualizar permissões:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao atualizar as permissões.",
    };
  }

  revalidatePath(
    "/settings/members",
  );

  revalidatePath("/settings");

  return {
    success:
      "Permissões atualizadas.",
  };
}

export async function setMemberActive(
  memberId: string,
  active: boolean,
): Promise<MemberActionState> {
  const parsedId =
    memberIdSchema.safeParse(memberId);

  if (!parsedId.success) {
    return {
      error: "Usuário inválido.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.MEMBERS_DEACTIVATE,
      );

    const { error } = await supabase.rpc(
      "update_member_active",
      {
        p_member_id: parsedId.data,
        p_active: active,
      },
    );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "22023" ||
        error.code === "P0002"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao alterar status do membro:",
        {
          memberId,
          active,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível alterar o status do usuário.",
      };
    }
  } catch (error) {
    if (
      isPermissionDeniedError(error)
    ) {
      return {
        error: error.message,
      };
    }

    console.error(
      "Erro inesperado ao alterar status do membro:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao alterar o usuário.",
    };
  }

  revalidatePath(
    "/settings/members",
  );

  revalidatePath("/settings");

  return {
    success: active
      ? "Usuário ativado."
      : "Usuário desativado.",
  };
}

export async function createMemberInvitation(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed =
    invitationSchema.safeParse({
      email: formData.get("email"),
    });

  if (!parsed.success) {
    return {
      error: "Verifique o e-mail.",

      fieldErrors: {
        email:
          parsed.error.issues[0]
            ?.message ??
          "E-mail inválido.",
      },
    };
  }

  const permissionKeys = formData
    .getAll("permissions")
    .filter(
      (value): value is string =>
        typeof value === "string",
    );

  const rawToken = randomBytes(32)
    .toString("base64url");

  const tokenHash = createHash(
    "sha256",
  )
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() +
      7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.MEMBERS_INVITE,
      );

    const { error } = await supabase.rpc(
      "create_member_invitation",
      {
        p_email: parsed.data.email,
        p_token_hash: tokenHash,
        p_permission_keys:
          permissionKeys,
        p_expires_at: expiresAt,
      },
    );

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "Este e-mail já está vinculado a uma empresa.",

          fieldErrors: {
            email:
              "Use o e-mail de um usuário que ainda não pertence a uma empresa.",
          },
        };
      }

      if (
        error.code === "42501" ||
        error.code === "22023"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao criar convite:",
        {
          email: parsed.data.email,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível criar o convite.",
      };
    }
  } catch (error) {
    if (
      isPermissionDeniedError(error)
    ) {
      return {
        error: error.message,
      };
    }

    console.error(
      "Erro inesperado ao criar convite:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao criar o convite.",
    };
  }

  revalidatePath(
    "/settings/members",
  );

  return {
    success:
      "Convite criado. Copie o link antes de sair desta página.",

    invitePath:
      `/invite/${rawToken}`,
  };
}

export async function revokeMemberInvitation(
  invitationId: string,
): Promise<MemberActionState> {
  const parsedId =
    invitationIdSchema.safeParse(
      invitationId,
    );

  if (!parsedId.success) {
    return {
      error: "Convite inválido.",
    };
  }

  try {
    const { supabase } =
      await requirePermission(
        PERMISSIONS.MEMBERS_INVITE,
      );

    const { error } = await supabase.rpc(
      "revoke_member_invitation",
      {
        p_invitation_id:
          parsedId.data,
      },
    );

    if (error) {
      if (
        error.code === "42501" ||
        error.code === "P0002"
      ) {
        return {
          error: error.message,
        };
      }

      console.error(
        "Erro ao revogar convite:",
        {
          invitationId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      return {
        error:
          "Não foi possível revogar o convite.",
      };
    }
  } catch (error) {
    if (
      isPermissionDeniedError(error)
    ) {
      return {
        error: error.message,
      };
    }

    console.error(
      "Erro inesperado ao revogar convite:",
      error,
    );

    return {
      error:
        "Ocorreu um erro inesperado ao revogar o convite.",
    };
  }

  revalidatePath(
    "/settings/members",
  );

  return {
    success:
      "Convite revogado.",
  };
}