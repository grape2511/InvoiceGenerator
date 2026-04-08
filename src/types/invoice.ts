export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  paymentTerms: string;
  paymentDue: string;
  poNumber: string;
  // Sender
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderCountry: string;
  senderPhone: string;
  // Logo
  logoUrl: string;
  // Bill To
  billTo: string;
  // Ship To
  shipTo: string;
  // Line items
  items: LineItem[];
  // VAT
  vatRate: number;
  // Discount
  discountValue: number;
  discountType: "percentage" | "flat";
  // Shipping
  shipping: number;
  // Business details
  businessDetails: string;
  // Bank info
  bankInfo: string;
  // Notes
  notes: string;
  // Currency
  currency: string;
  // Created/updated
  createdAt: string;
  updatedAt: string;
}

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  EUR: { symbol: "€", label: "EUR (€)" },
  USD: { symbol: "$", label: "USD ($)" },
  GBP: { symbol: "£", label: "GBP (£)" },
  SEK: { symbol: "kr", label: "SEK (kr)" },
};

export function createDefaultInvoice(): Invoice {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 14);

  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    date: formatDate(today),
    paymentTerms: "14 days",
    paymentDue: formatDate(dueDate),
    poNumber: "",
    senderName: "Rypäle Oy",
    senderAddress: "Kaljaasi Fortunan Katu 1 C 81",
    senderCity: "00540 Helsinki",
    senderCountry: "Finland",
    senderPhone: "Tel .358 40 4889899",
    logoUrl: "/logo.png",
    billTo: "",
    shipTo: "",
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        rate: 0,
      },
    ],
    vatRate: 25.5,
    discountValue: 0,
    discountType: "percentage",
    shipping: 0,
    businessDetails:
      "FI Business ID:2569329-9\nVAT: FI25693299\nPayment Due Date: " +
      formatDateFinnish(dueDate),
    bankInfo:
      "OP Yrityspankki\nIBAN:FI92 5000 0120 3547 16\nSWIFT/BIC: OKOYFIHH\nGebhardinaukio 1, 00510 Helsinki",
    notes: "",
    currency: "EUR",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateInvoiceNumber(): string {
  if (typeof window === "undefined") return "";
  const year = new Date().getFullYear();
  const saved = localStorage.getItem("invoice_counter");
  let counter = 1;
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.year === year) {
      counter = parsed.counter + 1;
    }
  }
  localStorage.setItem(
    "invoice_counter",
    JSON.stringify({ year, counter })
  );
  return `${year}${String(counter).padStart(6, "0")}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateFinnish(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

export function calculateSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function calculateVat(subtotal: number, vatRate: number): number {
  return subtotal * (vatRate / 100);
}

export function calculateTotal(
  subtotal: number,
  vatAmount: number,
  discountValue: number,
  discountType: "percentage" | "flat",
  shipping: number
): number {
  let discount = 0;
  if (discountType === "percentage") {
    discount = subtotal * (discountValue / 100);
  } else {
    discount = discountValue;
  }
  return subtotal + vatAmount - discount + shipping;
}
