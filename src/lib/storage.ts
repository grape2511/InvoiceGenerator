import { Invoice, generateInvoiceNumber } from "@/types/invoice";

const STORAGE_KEY = "invoices";

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getInvoice(id: string): Invoice | undefined {
  return getInvoices().find((inv) => inv.id === id);
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  const index = invoices.findIndex((inv) => inv.id === invoice.id);
  invoice.updatedAt = new Date().toISOString();
  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.push(invoice);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter((inv) => inv.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function duplicateInvoice(id: string): Invoice | null {
  const original = getInvoice(id);
  if (!original) return null;
  const copy: Invoice = {
    ...original,
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(), // auto-number like a brand-new invoice
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return copy;
}
