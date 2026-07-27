import { createHash } from "node:crypto";

import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { InvitationSignupForm } from "../[token]/invitation-signup-form";

export const dynamic =
  "force-dynamic";

export const runtime = "nodejs";

type PublicInvitation = {
  email: string;
  company_name: string;
  expires_at: string;
};

type InvitationPageProps = {
  params: {
    token: string;
  };
};

export default async function InvitationPage({
  params,
}: InvitationPageProps) {
  const token = params.token?.trim();

  if (
    !token ||
    token.length < 32 ||
    token.length > 200
  ) {
    return <InvalidInvitation />;
  }

  const tokenHash = createHash(
    "sha256",
  )
    .update(token)
    .digest("hex");

  const supabase =
    await createClient();

  const {
    data: invitationRows,
    error,
  } = await supabase.rpc(
    "get_member_invitation_public",
    {
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    console.error(
      "Erro ao consultar convite:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    return <InvalidInvitation />;
  }

  const invitation =
    invitationRows?.[0] as
      | PublicInvitation
      | undefined;

  if (!invitation) {
    return <InvalidInvitation />;
  }

  return (
    <InvitationSignupForm
      token={token}
      email={invitation.email}
      companyName={
        invitation.company_name
      }
    />
  );
}

function InvalidInvitation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Convite indisponível
        </CardTitle>

        <CardDescription>
          Este convite é inválido, expirou,
          foi revogado ou já foi utilizado.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ir para o login
        </Link>
      </CardContent>
    </Card>
  );
}