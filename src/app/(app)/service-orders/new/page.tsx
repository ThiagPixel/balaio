import Link from "next/link";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { CreateOrderForm } from "../order-forms";
import { brazilToday } from "@/lib/loans";

export const dynamic = "force-dynamic";
export default async function NewServiceOrderPage() {
  await requirePagePermission(PERMISSIONS.OS_CREATE);
  await requirePagePermission(PERMISSIONS.OS_VIEW);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_service_order_people");
  if (error) throw new Error("Não foi possível consultar os profissionais.");
  return <div className="mx-auto max-w-3xl space-y-5"><div><Link href="/service-orders" className="text-sm text-brand-600">← Ordens de serviço</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Abrir OS</h1><p className="mt-1 text-sm text-slate-600">Defina o responsável principal e as etapas que precisam ser concluídas.</p></div><CreateOrderForm people={data as { id: string; full_name: string | null; email: string }[]} today={brazilToday()} /></div>;
}
