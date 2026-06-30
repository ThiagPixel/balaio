// Cliente Supabase para uso em Server Components, Server Actions e Route Handlers
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente admin (service_role) - APENAS no servidor
// Use com cuidado: bypassa RLS. Usado apenas em signup para criar tenant.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options: CookieOptions;
              }) => cookieStore.set(name, value, options),
            );
          } catch {
            // O `setAll` é chamado em Server Components onde cookies()
            // só podem ser lidos. Ignorar nesse contexto.
          }
        },
      },
    },
  );
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

// RPC helper que usa service_role via função SQL (bypassa RLS)
export async function createTenantWithAdmin(
  name: string,
  slug: string,
  userId: string,
  email: string,
  fullName: string,
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("create_tenant_with_admin", {
    p_name: name,
    p_slug: slug,
    p_user_id: userId,
    p_email: email,
    p_full_name: fullName,
  });

  if (error) throw error;
}
