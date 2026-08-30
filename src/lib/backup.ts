// Local backup + restore for invoices and templates. Still useful with the
// database: Export downloads an offline copy; Import parses a file so the page
// can re-save its contents to Supabase.
import { Invoice, Template } from "@/types/invoice";

const BACKUP_APP = "invoice-generator";
const BACKUP_VERSION = 1;

interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  invoices: Invoice[];
  templates: Template[];
}

export function exportBackup(invoices: Invoice[], templates: Template[]): void {
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
}

export interface ParsedBackup {
  invoices: Invoice[];
  templates: Template[];
}

// Reads and validates a backup file, returning its records. Persisting them is
// the caller's job (so the same file works whether storage is local or cloud).
export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const data = parsed as Partial<BackupFile>;
  const invoices = Array.isArray(data.invoices)
    ? data.invoices.filter((i) => i && typeof i.id === "string")
    : [];
  const templates = Array.isArray(data.templates)
    ? data.templates.filter((t) => t && typeof t.id === "string")
    : [];

  if (invoices.length === 0 && templates.length === 0) {
    throw new Error(
      "This doesn't look like an invoice backup (no invoices or templates found)."
    );
  }

  return { invoices, templates };
}
