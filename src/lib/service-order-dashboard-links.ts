import type { ServiceOrderDashboard, ServiceOrderSummary } from "./service-orders";

type DashboardOrder = ServiceOrderDashboard["urgent"][number];

export function withServiceOrderIds(
  orders: DashboardOrder[],
  listedOrders: Pick<ServiceOrderSummary, "id" | "number">[],
): DashboardOrder[] {
  const idsByNumber = new Map(listedOrders.map(({ number, id }) => [number, id]));
  return orders.map((order) => ({ ...order, id: order.id || idsByNumber.get(order.number) || "" }));
}

export function serviceOrderHref(order: Pick<DashboardOrder, "id">): string {
  return typeof order.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id)
    ? `/service-orders/${order.id}`
    : "/service-orders";
}
