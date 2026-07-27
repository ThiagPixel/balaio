/**
 * Catálogo de permissões reconhecidas pela aplicação.
 *
 * As chaves precisam ser iguais às cadastradas na tabela:
 *
 * public.permissions
 *
 * Este arquivo pode ser utilizado no servidor e no frontend.
 * Ele não concede acesso; apenas evita strings soltas e erros de digitação.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_VIEW_FINANCIAL: "dashboard.view_financial",
  DASHBOARD_VIEW_STOCK: "dashboard.view_stock",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_VIEW_COST: "products.view_cost",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_TOGGLE_ACTIVE: "products.toggle_active",
  PRODUCTS_DELETE: "products.delete",

  STOCK_VIEW: "stock.view",
  STOCK_IN: "stock.in",
  STOCK_OUT: "stock.out",
  STOCK_ADJUST: "stock.adjust",

  FINANCE_VIEW: "finance.view",
  FINANCE_CREATE: "finance.create",
  FINANCE_SETTLE: "finance.settle",
  FINANCE_REOPEN: "finance.reopen",
  FINANCE_CANCEL: "finance.cancel",
  FINANCE_DELETE: "finance.delete",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",

  MEMBERS_VIEW: "members.view",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_PERMISSIONS: "members.permissions",
  MEMBERS_DEACTIVATE: "members.deactivate",
} as const;

/**
 * Gera automaticamente uma união com todas as permissões válidas.
 *
 * Exemplo:
 *
 * "products.view" | "products.create" | "stock.out" | ...
 */
export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Lista com todas as permissões reconhecidas pelo código.
 */
export const ALL_PERMISSIONS = Object.values(
  PERMISSIONS,
) as PermissionKey[];