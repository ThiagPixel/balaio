"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isPermissionDeniedError, requirePermission } from "@/lib/supabase/access";
import { brazilToday } from "@/lib/loans";

export type OsState = { error?: string; orderId?: string; tenantId?: string } | null;
const uuid = z.string().uuid();
const orderSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000),
  location: z.string().trim().max(160),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  due_date: z.string(), principal_id: uuid,
  steps: z.array(z.object({ title: z.string().trim().min(3).max(160), assignee_id: uuid,
    depends_on_previous: z.boolean().optional() })).min(1).max(20),
});
const errorMessage = (error: { code?: string; message: string }, fallback: string) =>
  ["42501", "22023", "P0002"].includes(error.code ?? "") ? error.message : fallback;
function formString(form: FormData, key: string) { return String(form.get(key) ?? ""); }
async function invoke(permission: typeof PERMISSIONS[keyof typeof PERMISSIONS], rpc: string, args: Record<string, unknown>, orderId: string): Promise<OsState> {
  try {
    const { supabase } = await requirePermission(permission);
    const { error } = await supabase.rpc(rpc, args);
    if (error) return { error: errorMessage(error, "Não foi possível atualizar a OS.") };
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath("/service-orders");
  revalidatePath("/");
  redirect(`/service-orders/${orderId}`);
}
export async function createServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const dueDate = formString(form, "due_date");
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? new Date(`${dueDate}T12:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== dueDate || dueDate < brazilToday()) {
    return { error: "Selecione um prazo válido a partir de hoje." };
  }
  let steps: unknown;
  try { steps = JSON.parse(formString(form, "steps")); } catch { return { error: "Informe as etapas da OS." }; }
  const parsed = orderSchema.safeParse({ title: formString(form, "title"), description: formString(form, "description"),
    location: formString(form, "location"), priority: formString(form, "priority"),
    due_date: dueDate, principal_id: formString(form, "principal_id"), steps });
  if (!parsed.success) return { error: "Revise o serviço, responsável e etapas." };
  let id: string;
  let tenantId: string;
  try {
    const access = await requirePermission(PERMISSIONS.OS_CREATE);
    const { supabase } = access;
    const { data, error } = await supabase.rpc("create_service_order", {
      p_title: parsed.data.title, p_description: parsed.data.description || null,
      p_location_label: parsed.data.location || null, p_priority: parsed.data.priority,
      p_due_date: parsed.data.due_date, p_principal_id: parsed.data.principal_id,
      p_steps: parsed.data.steps,
    });
    if (error) return { error: errorMessage(error, "Não foi possível abrir a OS.") };
    id = data as string;
    tenantId = access.tenantId;
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath("/service-orders"); revalidatePath("/");
  return { orderId: id, tenantId };
}
const idSchema = z.object({ order_id: uuid });
function parsedId(form: FormData) { return idSchema.safeParse({ order_id: formString(form, "order_id") }); }
export async function startServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const p = parsedId(form); if (!p.success) return { error: "OS inválida." };
  return invoke(PERMISSIONS.OS_MANAGE, "start_service_order", { p_order_id: p.data.order_id }, p.data.order_id);
}
export async function addServiceOrderBlocker(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ order_id: uuid, kind: z.enum(["MATERIAL", "EXTERNAL", "OTHER"]),
    description: z.string().trim().min(3).max(500), responsible: z.string().trim().max(120) }).safeParse({
    order_id: formString(form, "order_id"), kind: formString(form, "kind"),
    description: formString(form, "description"), responsible: formString(form, "responsible"),
  });
  if (!p.success) return { error: "Revise os dados da pendência." };
  return invoke(PERMISSIONS.OS_MANAGE, "add_service_order_blocker", {
    p_order_id: p.data.order_id, p_kind: p.data.kind, p_description: p.data.description,
    p_responsible_name: p.data.responsible || null,
  }, p.data.order_id);
}
export async function resolveServiceOrderBlocker(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ blocker_id: uuid, order_id: uuid, note: z.string().trim().max(1000) }).safeParse({
    blocker_id: formString(form, "blocker_id"), order_id: formString(form, "order_id"), note: formString(form, "note"),
  });
  if (!p.success) return { error: "Pendência inválida." };
  return invoke(PERMISSIONS.OS_RESOLVE, "resolve_service_order_blocker", { p_blocker_id: p.data.blocker_id, p_note: p.data.note || null }, p.data.order_id);
}
export async function completeServiceOrderStep(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ step_id: uuid, order_id: uuid, note: z.string().trim().max(1000) }).safeParse({
    step_id: formString(form, "step_id"), order_id: formString(form, "order_id"), note: formString(form, "note"),
  });
  if (!p.success) return { error: "Etapa inválida." };
  return invoke(PERMISSIONS.OS_EXECUTE, "complete_service_order_step", { p_step_id: p.data.step_id, p_note: p.data.note || null }, p.data.order_id);
}
export async function startServiceOrderStep(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ step_id: uuid, order_id: uuid }).safeParse({
    step_id: formString(form, "step_id"), order_id: formString(form, "order_id"),
  });
  if (!p.success) return { error: "Etapa inválida." };
  return invoke(PERMISSIONS.OS_EXECUTE, "start_service_order_step", { p_step_id: p.data.step_id }, p.data.order_id);
}
export async function updateServiceOrderStep(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ step_id: uuid, order_id: uuid, title: z.string().trim().min(3).max(160),
    assignee_id: uuid, depends_on_previous: z.boolean() }).safeParse({
    step_id: formString(form, "step_id"), order_id: formString(form, "order_id"),
    title: formString(form, "title"), assignee_id: formString(form, "assignee_id"),
    depends_on_previous: form.get("depends_on_previous") === "on",
  });
  if (!p.success) return { error: "Revise o nome e o profissional da etapa." };
  return invoke(PERMISSIONS.OS_MANAGE, "update_service_order_step", {
    p_step_id: p.data.step_id, p_title: p.data.title,
    p_assignee_id: p.data.assignee_id, p_depends_on_previous: p.data.depends_on_previous,
  }, p.data.order_id);
}
export async function updateServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ order_id: uuid, title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(2000), location: z.string().trim().max(160),
    priority: z.enum(["LOW", "NORMAL", "HIGH"]), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    principal_id: uuid }).safeParse({ order_id: formString(form, "order_id"),
    title: formString(form, "title"), description: formString(form, "description"),
    location: formString(form, "location"), priority: formString(form, "priority"),
    due_date: formString(form, "due_date"), principal_id: formString(form, "principal_id") });
  if (!p.success) return { error: "Revise os dados da OS." };
  return invoke(PERMISSIONS.OS_MANAGE, "update_service_order", {
    p_order_id: p.data.order_id, p_title: p.data.title,
    p_description: p.data.description || null, p_location_label: p.data.location || null,
    p_priority: p.data.priority, p_due_date: p.data.due_date,
    p_principal_id: p.data.principal_id,
  }, p.data.order_id);
}
export async function addServiceOrderStep(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ order_id: uuid, title: z.string().trim().min(3).max(160), assignee_id: uuid,
    depends_on_previous: z.boolean() }).safeParse({ order_id: formString(form, "order_id"),
    title: formString(form, "title"), assignee_id: formString(form, "assignee_id"),
    depends_on_previous: form.get("depends_on_previous") === "on" });
  if (!p.success) return { error: "Revise os dados da nova etapa." };
  return invoke(PERMISSIONS.OS_MANAGE, "add_service_order_step", {
    p_order_id: p.data.order_id, p_title: p.data.title,
    p_assignee_id: p.data.assignee_id, p_depends_on_previous: p.data.depends_on_previous,
  }, p.data.order_id);
}
export async function deleteServiceOrderStep(_state: OsState, form: FormData): Promise<OsState> {
  const p = z.object({ step_id: uuid, order_id: uuid }).safeParse({
    step_id: formString(form, "step_id"), order_id: formString(form, "order_id") });
  if (!p.success) return { error: "Etapa inválida." };
  return invoke(PERMISSIONS.OS_MANAGE, "delete_service_order_step", { p_step_id: p.data.step_id }, p.data.order_id);
}
export async function archiveServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const p = parsedId(form); if (!p.success) return { error: "OS inválida." };
  try {
    const { supabase } = await requirePermission(PERMISSIONS.OS_MANAGE);
    const { error } = await supabase.rpc("archive_service_order", { p_order_id: p.data.order_id });
    if (error) return { error: errorMessage(error, "Não foi possível excluir a OS da operação.") };
  } catch (error) {
    if (isPermissionDeniedError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath("/service-orders"); revalidatePath("/");
  redirect("/service-orders");
}
export async function restoreServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const p = parsedId(form); if (!p.success) return { error: "OS inválida." };
  return invoke(PERMISSIONS.OS_MANAGE, "restore_service_order", { p_order_id: p.data.order_id }, p.data.order_id);
}
export async function completeServiceOrder(_state: OsState, form: FormData): Promise<OsState> {
  const p = parsedId(form); if (!p.success) return { error: "OS inválida." };
  return invoke(PERMISSIONS.OS_COMPLETE, "complete_service_order", { p_order_id: p.data.order_id }, p.data.order_id);
}
