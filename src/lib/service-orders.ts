export type ServiceOrderStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "COMPLETED";
export type ServiceOrderSummary = {
  id: string; number: number; title: string; location_label: string | null;
  priority: "LOW" | "NORMAL" | "HIGH"; status: ServiceOrderStatus;
  due_date: string | null; created_at: string; principal_name: string;
  waiting_for: string | null;
};
export type ServiceOrderStep = {
  id: string; position: number; title: string; assignee_id: string;
  assignee_name: string; completed_at: string | null; completion_note: string | null;
  depends_on_title: string | null;
  depends_on_completed: boolean | null;
};
export type ServiceOrderBlocker = {
  id: string; kind: string; description: string; responsible_name: string | null;
  created_at: string; resolved_at: string | null; resolution_note: string | null;
};
export type ServiceOrder = ServiceOrderSummary & {
  principal_id: string; description: string | null; started_at: string | null;
  completed_at: string | null; steps: ServiceOrderStep[];
  blockers: ServiceOrderBlocker[];
  events: { id: number; event_type: string; detail: Record<string, unknown>; created_at: string }[];
};
export type ServiceOrderDashboard = {
  open: number; in_progress: number; waiting: number; completed: number;
  urgent: (Pick<ServiceOrderSummary, "id" | "number" | "title" | "location_label" | "status" | "due_date"> & {
    waiting_for: string | null; waiting_kind: string | null;
  })[];
};
export const SERVICE_ORDER_LABELS: Record<ServiceOrderStatus, string> = {
  OPEN: "Em aberto", IN_PROGRESS: "Em andamento", WAITING: "Aguardando", COMPLETED: "Concluída",
};
