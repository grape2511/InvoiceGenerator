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

export interface Template {
  id: string;
  name: string;
  // Sender
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderCountry: string;
  senderPhone: string;
  // Logo
  logoUrl: string;
  // Bill To / Ship To
  billTo: string;
  shipTo: string;
  // Line items (defaults)
  items: LineItem[];
  // Defaults
  vatRate: number;
  discountValue: number;
  discountType: "percentage" | "flat";
  shipping: number;
  businessDetails: string;
  bankInfo: string;
  notes: string;
  currency: string;
  paymentTerms: string;
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

export function createDefaultTemplate(): Template {
  return {
    id: crypto.randomUUID(),
    name: "",
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
    businessDetails: "FI Business ID:2569329-9\nVAT: FI25693299",
    bankInfo:
      "OP Yrityspankki\nIBAN:FI92 5000 0120 3547 16\nSWIFT/BIC: OKOYFIHH\nGebhardinaukio 1, 00510 Helsinki",
    notes: "",
    currency: "EUR",
    paymentTerms: "14 days",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Wraps a Template in Invoice shape so InvoiceForm can edit it directly.
// Invoice-only fields (number, dates, PO) are blanked.
export function templateToInvoiceShape(t: Template): Invoice {
  return {
    id: t.id,
    invoiceNumber: "",
    date: "",
    paymentTerms: t.paymentTerms,
    paymentDue: "",
    poNumber: "",
    senderName: t.senderName,
    senderAddress: t.senderAddress,
    senderCity: t.senderCity,
    senderCountry: t.senderCountry,
    senderPhone: t.senderPhone,
    logoUrl: t.logoUrl,
    billTo: t.billTo,
    shipTo: t.shipTo,
    items: t.items,
    vatRate: t.vatRate,
    discountValue: t.discountValue,
    discountType: t.discountType,
    shipping: t.shipping,
    businessDetails: t.businessDetails,
    bankInfo: t.bankInfo,
    notes: t.notes,
    currency: t.currency,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function invoiceShapeToTemplate(inv: Invoice, name: string): Template {
  return {
    id: inv.id,
    name,
    senderName: inv.senderName,
    senderAddress: inv.senderAddress,
    senderCity: inv.senderCity,
    senderCountry: inv.senderCountry,
    senderPhone: inv.senderPhone,
    logoUrl: inv.logoUrl,
    billTo: inv.billTo,
    shipTo: inv.shipTo,
    items: inv.items,
    vatRate: inv.vatRate,
    discountValue: inv.discountValue,
    discountType: inv.discountType,
    shipping: inv.shipping,
    businessDetails: inv.businessDetails,
    bankInfo: inv.bankInfo,
    notes: inv.notes,
    currency: inv.currency,
    paymentTerms: inv.paymentTerms,
    createdAt: inv.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function createInvoiceFromTemplate(t: Template): Invoice {
  const today = new Date();
  const days = parseInt(t.paymentTerms?.match(/\d+/)?.[0] || "14", 10);
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + days);

  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    date: formatDate(today),
    paymentTerms: t.paymentTerms || "14 days",
    paymentDue: formatDate(dueDate),
    poNumber: "",
    senderName: t.senderName,
    senderAddress: t.senderAddress,
    senderCity: t.senderCity,
    senderCountry: t.senderCountry,
    senderPhone: t.senderPhone,
    logoUrl: t.logoUrl,
    billTo: t.billTo,
    shipTo: t.shipTo,
    items: t.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    vatRate: t.vatRate,
    discountValue: t.discountValue,
    discountType: t.discountType,
    shipping: t.shipping,
    businessDetails:
      t.businessDetails +
      (t.businessDetails ? "\n" : "") +
      "Payment Due Date: " +
      formatDateFinnish(dueDate),
    bankInfo: t.bankInfo,
    notes: t.notes,
    currency: t.currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateInvoiceNumber(): string {
  if (typeof window === "undefined") return "";
  const year = new Date().getFullYear();
  const prefix = String(year);
  let maxCounter = 0;
  try {
    const data = localStorage.getItem("invoices");
    if (data) {
      const invoices: { invoiceNumber?: string }[] = JSON.parse(data);
      for (const inv of invoices) {
        const num = inv.invoiceNumber;
        if (typeof num === "string" && num.startsWith(prefix)) {
          const suffix = num.slice(prefix.length);
          if (/^\d+$/.test(suffix)) {
            const n = parseInt(suffix, 10);
            if (n > maxCounter) maxCounter = n;
          }
        }
      }
    }
  } catch {
    // fall through with maxCounter = 0
  }
  const counter = maxCounter + 1;
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
