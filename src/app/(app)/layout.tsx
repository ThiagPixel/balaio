import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Buscar nome do tenant (via RPC que usa get_tenant_id())
  const { data: tenantId } = await supabase.rpc("get_tenant_id");
  let companyName = "Minha empresa";
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();
    if (tenant) companyName = tenant.name;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar tenantName={companyName} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
