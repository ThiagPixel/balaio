// Helper para obter o tenant_id a partir do user (JWT)
import type { User } from "@supabase/supabase-js";

export function getTenantIdFromUser(user: User | null): string | null {
  if (!user) return null;
  return (
    (user.app_metadata?.tenant_id as string | undefined) ??
    (user.user_metadata?.tenant_id as string | undefined) ??
    null
  );
}

export async function requireTenant() {
  const { createClient } = await import("./server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) throw new Error("Tenant não encontrado no token");
  return { supabase, user, tenantId };
}
