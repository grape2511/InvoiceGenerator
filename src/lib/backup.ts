// Local backup + restore for invoices and templates.
// This is the safety net against localStorage being cleared: export writes
// everything to a JSON file the user keeps; import merges it back in.
import { Invoice, Template } from "@/types/invoice";
import { getInvoices, saveInvoice } from "@/lib/storage";
import { getTemplates, saveTemplate } from "@/lib/templateStorage";

const BACKUP_APP = "invoice-generator";
const BACKUP_VERSION = 1;

interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  invoices: Invoice[];
  templates: Template[];
}

export function exportBackup(): { invoices: number; templates: number } {
  const invoices = getInvoices();
  const templates = getTemplates();
  const data: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    invoices,
    templates,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { invoices: invoices.length, templates: templates.length };
}

export interface ImportResult {
  invoices: number;
  templates: number;
}

// Merges a backup file into current storage (imported records are added or,
// when an id already exists, overwrite that record). Existing records not in
// the file are left untouched, so importing never deletes anything.
export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const data = parsed as Partial<BackupFile>;
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const templates = Array.isArray(data.templates) ? data.templates : [];

  if (invoices.length === 0 && templates.length === 0) {
    throw new Error(
      "This doesn't look like an invoice backup (no invoices or templates found)."
    );
  }

  for (const inv of invoices) {
    if (inv && typeof inv.id === "string") saveInvoice(inv);
  }
  for (const t of templates) {
    if (t && typeof t.id === "string") saveTemplate(t);
  }

  return { invoices: invoices.length, templates: templates.length };
}
