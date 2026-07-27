import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  can,
  getAccessContext,
} from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

import {
  Sidebar,
  type SidebarNavigationItem,
} from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /*
   * Carrega as permissões no servidor.
   *
   * A Sidebar recebe somente os links que
   * este usuário realmente pode visualizar.
   */
  const access = await getAccessContext();

  const navigation: SidebarNavigationItem[] = [];

  if (
    can(
      access,
      PERMISSIONS.DASHBOARD_VIEW,
    )
  ) {
    navigation.push({
      name: "Dashboard",
      href: "/",
      icon: "📊",
    });
  }

  if (
    can(
      access,
      PERMISSIONS.PRODUCTS_VIEW,
    )
  ) {
    navigation.push({
      name: "Produtos",
      href: "/products",
      icon: "📦",
    });
  }

  if (
    can(
      access,
      PERMISSIONS.STOCK_VIEW,
    )
  ) {
    navigation.push({
      name: "Estoque",
      href: "/stock",
      icon: "🔄",
    });
  }

  if (
    can(
      access,
      PERMISSIONS.FINANCE_VIEW,
    )
  ) {
    navigation.push({
      name: "Financeiro",
      href: "/financial",
      icon: "💰",
    });
  }

  if (
    can(
      access,
      PERMISSIONS.MEMBERS_VIEW,
    )
  ) {
    navigation.push({
      name: "Usuários",
      href: "/settings/members",
      icon: "👥",
    });
  }

  if (
    can(
      access,
      PERMISSIONS.SETTINGS_VIEW,
    )
  ) {
    navigation.push({
      name: "Configurações",
      href: "/settings",
      icon: "⚙️",
    });
  }

  /*
   * O nome da empresa não depende de settings.view.
   * Ele é necessário apenas para identificar o tenant
   * atual no cabeçalho do sistema.
   */
  let companyName = "Minha empresa";

  const {
    data: tenantId,
    error: tenantIdError,
  } = await supabase.rpc(
    "get_tenant_id",
  );

  if (tenantIdError) {
    console.error(
      "Erro ao identificar empresa:",
      {
        code: tenantIdError.code,
        message: tenantIdError.message,
        details: tenantIdError.details,
        hint: tenantIdError.hint,
      },
    );
  }

  if (tenantId) {
    const {
      data: tenant,
      error: tenantError,
    } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      console.error(
        "Erro ao carregar nome da empresa:",
        {
          code: tenantError.code,
          message: tenantError.message,
          details: tenantError.details,
          hint: tenantError.hint,
        },
      );
    }

    if (tenant?.name) {
      companyName = tenant.name;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        tenantName={companyName}
        navigation={navigation}
      />

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}