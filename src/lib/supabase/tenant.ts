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

  if (error || !data) {
    throw new Error("Tenant não encontrado");
  }

  return { supabase, user, tenantId: data as string };
}
