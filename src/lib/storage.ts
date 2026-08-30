import { Invoice, nextInvoiceNumber } from "@/types/invoice";
import { supabase } from "@/lib/supabase";

const TABLE = "ig_invoices";

// Each row stores the full Invoice object in `data`; user_id is filled from the
// auth token by a column default, so the client never sends it.

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.data as Invoice);
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as Invoice) ?? undefined;
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  invoice.updatedAt = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert({
    id: invoice.id,
    data: invoice,
    updated_at: invoice.updatedAt,
  });
  if (error) throw new Error(error.message);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Returns an unsaved copy with a fresh id and the next sequential number.
// `existing` is the already-loaded invoice list, used to compute the number
// (we can no longer read all invoices synchronously from localStorage).
export function duplicateInvoice(
  original: Invoice,
  existing: Invoice[]
): Invoice {
  return {
    ...original,
    id: crypto.randomUUID(),
    invoiceNumber: nextInvoiceNumber(existing),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
