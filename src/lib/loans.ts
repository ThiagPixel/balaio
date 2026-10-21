export type LoanItem = {
  id: string; name: string; identifier: string; description: string | null;
  active: boolean; available: boolean;
};

export type ItemLoan = {
  id: string; item_id: string; item_name: string; item_identifier: string;
  borrower_name: string; borrower_affiliation: string | null; due_date: string | null;
  checkout_notes: string | null; checked_out_at: string; checked_out_by_name: string | null;
  returned_at: string | null; returned_by_name: string | null; return_notes: string | null;
};

export type LoanDashboard = {
  open: number;
  urgent: { item_name: string; item_identifier: string; borrower_name: string;
    checked_out_at: string }[];
};

export function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
