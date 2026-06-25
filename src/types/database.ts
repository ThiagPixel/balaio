// =====================================================
// StockFlow - Tipos do banco Supabase
// =====================================================
// Você pode regenerar esses tipos rodando:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// Por enquanto, mantemos manualmente para simplicidade.
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StockMovementType = "IN" | "OUT" | "ADJUST";
export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionStatus = "PENDING" | "PAID" | "CANCELLED";
export type UserRole = "owner" | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  current_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos auxiliares para criação
export type NewProduct = Omit<
  Product,
  "id" | "tenant_id" | "created_at" | "updated_at" | "current_stock"
> & {
  current_stock?: number;
};

export type NewStockMovement = Omit<
  StockMovement,
  "id" | "tenant_id" | "created_at"
>;

export type NewTransaction = Omit<
  Transaction,
  "id" | "tenant_id" | "created_at" | "updated_at" | "paid_at" | "status"
> & {
  status?: TransactionStatus;
  paid_at?: string | null;
};
