"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Invoice,
  Template,
  createDefaultInvoice,
  createDefaultTemplate,
  templateToInvoiceShape,
  invoiceShapeToTemplate,
  createInvoiceFromTemplate,
} from "@/types/invoice";
import {
  getInvoices,
  saveInvoice,
  deleteInvoice,
  duplicateInvoice,
} from "@/lib/storage";
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
} from "@/lib/templateStorage";
import { exportBackup, parseBackupFile } from "@/lib/backup";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import InvoiceForm from "@/components/InvoiceForm";
import InvoiceList from "@/components/InvoiceList";
import TemplateList from "@/components/TemplateList";
import CardReceiptsTab from "@/components/CardReceiptsTab";
import Login from "@/components/Login";

type Tab = "invoices" | "templates" | "receipts";
type View = "list" | "edit-invoice" | "edit-template";

export default function Home() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [view, setView] = useState<View>("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  // ---- Auth ----
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setLoadError("");
    try {
      const [inv, tpl] = await Promise.all([getInvoices(), getTemplates()]);
      setInvoices(inv);
      setTemplates(tpl);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load (or clear) data whenever the signed-in user changes.
  useEffect(() => {
    if (session) {
      loadData();
    } else {
      setInvoices([]);
      setTemplates([]);
    }
  }, [session, loadData]);

  const refreshInvoices = async () => setInvoices(await getInvoices());
  const refreshTemplates = async () => setTemplates(await getTemplates());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const flashSaveMessage = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(""), 2000);
  };

  // ---- Backup / restore ----

  const handleExportBackup = () => {
    try {
      exportBackup(invoices, templates);
      flashSaveMessage(
        `Backed up ${invoices.length} invoice(s), ${templates.length} template(s)`
      );
    } catch (err) {
      alert("Export failed: " + (err as Error).message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file) return;
    try {
      const { invoices: imported, templates: importedT } =
        await parseBackupFile(file);
      for (const inv of imported) await saveInvoice(inv);
      for (const t of importedT) await saveTemplate(t);
      await refreshInvoices();
      await refreshTemplates();
      flashSaveMessage(
        `Restored ${imported.length} invoice(s), ${importedT.length} template(s)`
      );
    } catch (err) {
      alert("Import failed: " + (err as Error).message);
    }
  };

  // ---- Invoice handlers ----

  const handleNewInvoice = () => {
    try {
      const inv = createDefaultInvoice(invoices);
      setCurrentInvoice(inv);
      setView("edit-invoice");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("Error creating invoice: " + (err as Error).message);
    }
  };

  const handleSelectInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setCurrentInvoice(inv);
      setView("edit-invoice");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm("Delete this invoice?")) {
      try {
        await deleteInvoice(id);
        await refreshInvoices();
      } catch (err) {
        alert("Delete failed: " + (err as Error).message);
      }
    }
  };

  const handleDuplicateInvoice = (id: string) => {
    const original = invoices.find((i) => i.id === id);
    if (!original) return;
    const copy = duplicateInvoice(original, invoices);
    setCurrentInvoice(copy);
    setView("edit-invoice");
  };

  // ---- Template handlers ----

  const handleNewTemplate = () => {
    const t = createDefaultTemplate();
    setCurrentInvoice(templateToInvoiceShape(t));
    setCurrentTemplateName(t.name);
    setView("edit-template");
  };

  const handleSelectTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (t) {
      setCurrentInvoice(templateToInvoiceShape(t));
      setCurrentTemplateName(t.name);
      setView("edit-template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Delete this template?")) {
      try {
        await deleteTemplate(id);
        await refreshTemplates();
      } catch (err) {
        alert("Delete failed: " + (err as Error).message);
      }
    }
  };

  const handleUseTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const inv = createInvoiceFromTemplate(t, invoices);
    setCurrentInvoice(inv);
    setView("edit-invoice");
    setTab("invoices");
  };

  const handleSaveTemplate = async () => {
    if (!currentInvoice) return;
    if (!currentTemplateName.trim()) {
      alert("Please enter a template name before saving.");
      return;
    }
    const t = invoiceShapeToTemplate(currentInvoice, currentTemplateName.trim());
    try {
      await saveTemplate(t);
      await refreshTemplates();
      flashSaveMessage("Template saved!");
    } catch (err) {
      alert("Save failed: " + (err as Error).message);
    }
  };

  // ---- Shared handlers ----

  const handleBack = async () => {
    setView("list");
    setCurrentInvoice(null);
    setCurrentTemplateName("");
    await refreshInvoices();
    await refreshTemplates();
  };

  const handleInvoiceSaved = async () => {
    flashSaveMessage("Invoice saved!");
    await refreshInvoices();
  };

  const handleSaveInvoiceAsTemplate = async () => {
    if (!currentInvoice) return;
    const name = prompt("Save this invoice as a template. Template name:");
    if (name === null) return; // cancelled
    if (!name.trim()) {
      alert("Please enter a template name.");
      return;
    }
    const t = invoiceShapeToTemplate(currentInvoice, name.trim());
    // The current invoice keeps its own id; the template is a new record.
    t.id = crypto.randomUUID();
    t.createdAt = new Date().toISOString();
    try {
      await saveTemplate(t);
      await refreshTemplates();
      flashSaveMessage("Saved as template!");
    } catch (err) {
      alert("Save failed: " + (err as Error).message);
    }
  };

  const handleDiscard = () => {
    const noun = editingTemplate ? "template" : "invoice";
    // Unsaved edits live only in state, so returning to the list without
    // saving is all that's needed — nothing was persisted.
    if (
      confirm(
        `Discard this ${noun}? Any unsaved changes will be lost.`
      )
    ) {
      handleBack();
    }
  };

  const handleInvoiceChange = useCallback((updated: Invoice) => {
    setCurrentInvoice(updated);
  }, []);

  const handleTabChange = (next: Tab) => {
    setTab(next);
    setView("list");
    setCurrentInvoice(null);
    setCurrentTemplateName("");
  };

  const isEditing = view !== "list";
  const editingTemplate = view === "edit-template";

  // ---- Auth gate ----
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="font-medium text-amber-800 mb-2">Supabase not configured</p>
          <p>
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the environment and
            reload.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={isEditing ? handleBack : undefined}
            className={`flex items-center gap-2 text-xl font-bold ${
              isEditing
                ? "text-indigo-600 hover:text-indigo-800 cursor-pointer"
                : "text-gray-800 cursor-default"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Invoice Generator
          </button>

          {isEditing && (
            <>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-gray-500 text-sm">
                {editingTemplate
                  ? currentTemplateName
                    ? `Template: ${currentTemplateName}`
                    : "New Template"
                  : `#${currentInvoice?.invoiceNumber || ""}`}
              </span>
            </>
          )}

          {saveMessage && (
            <span className="ml-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-0.5 rounded">
              {saveMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg py-2 px-4 text-sm flex items-center gap-2 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Back to list
            </button>
          ) : (
            <>
              {/* Backup / restore — protects against browser data loss */}
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                title="Restore invoices and templates from a backup file"
                className="text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg py-2 px-3 text-sm flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 4v12m0-12l-4 4m4-4l4 4" transform="rotate(180 12 12)" />
                </svg>
                Import
              </button>
              <button
                onClick={handleExportBackup}
                title="Download a backup of all invoices and templates"
                className="text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg py-2 px-3 text-sm flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                Export
              </button>
              {tab === "invoices" && (
                <button
                  onClick={handleNewInvoice}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Invoice
                </button>
              )}
              {tab === "templates" && (
                <button
                  onClick={handleNewTemplate}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Template
                </button>
              )}
            </>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg py-2 px-3 text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs (list view only) */}
      {!isEditing && (
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="max-w-4xl mx-auto flex gap-6">
            <button
              onClick={() => handleTabChange("invoices")}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === "invoices"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Invoices
              <span className="ml-2 text-xs text-gray-400">
                {invoices.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("templates")}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === "templates"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Templates
              <span className="ml-2 text-xs text-gray-400">
                {templates.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("receipts")}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === "receipts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Card Receipts
              <span className="ml-1 text-xs text-indigo-400 align-middle">✦</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-6">
        {loadError && (
          <div className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span>Couldn&apos;t load your data: {loadError}</span>
            <button onClick={loadData} className="underline shrink-0 ml-3">
              Retry
            </button>
          </div>
        )}
        {view === "list" ? (
          tab === "receipts" ? (
            <CardReceiptsTab />
          ) : dataLoading ? (
            <div className="text-center py-20 text-gray-400">
              <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : tab === "invoices" ? (
            <InvoiceList
              invoices={invoices}
              onSelect={handleSelectInvoice}
              onDelete={handleDeleteInvoice}
              onDuplicate={handleDuplicateInvoice}
            />
          ) : (
            <TemplateList
              templates={templates}
              onSelect={handleSelectTemplate}
              onUse={handleUseTemplate}
              onDelete={handleDeleteTemplate}
            />
          )
        ) : currentInvoice ? (
          <InvoiceForm
            invoice={currentInvoice}
            onChange={handleInvoiceChange}
            onSaved={handleInvoiceSaved}
            mode={editingTemplate ? "template" : "invoice"}
            templateName={currentTemplateName}
            onTemplateNameChange={setCurrentTemplateName}
            onSave={editingTemplate ? handleSaveTemplate : undefined}
            onSaveAsTemplate={
              editingTemplate ? undefined : handleSaveInvoiceAsTemplate
            }
            onDiscard={handleDiscard}
          />
        ) : null}
      </main>
    </div>
  );
}
