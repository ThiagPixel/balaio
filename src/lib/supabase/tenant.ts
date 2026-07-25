// Tenant ID é obtido diretamente do banco via RPC (get_tenant_id)

export async function requireTenant() {
  const { createClient } = await import("./server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // Busca tenant_id diretamente do banco via auth.uid()
  // A função SQL public.get_tenant_id() usa security definer (bypassa RLS)
  const { data, error } = await supabase.rpc("get_tenant_id");

  if (error) {
  console.error("Erro ao buscar tenant:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  throw new Error(
    `Erro ao buscar tenant: ${error.code} - ${error.message}`,
  );
}

if (!data) {
  console.error("Tenant retornou vazio:", {
    userId: user?.id,
    email: user?.email,
    data,
  });

  throw new Error(
    `Usuário autenticado, mas sem tenant vinculado: ${user?.id}`,
  );
}

  return { supabase, user, tenantId: data as string };
}
