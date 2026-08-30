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
  getInvoice,
  saveInvoice,
  deleteInvoice,
  duplicateInvoice,
} from "@/lib/storage";
import {
  getTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
} from "@/lib/templateStorage";
import { exportBackup, importBackup } from "@/lib/backup";
import InvoiceForm from "@/components/InvoiceForm";
import InvoiceList from "@/components/InvoiceList";
import TemplateList from "@/components/TemplateList";
import CardReceiptsTab from "@/components/CardReceiptsTab";

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
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInvoices(getInvoices());
    setTemplates(getTemplates());
  }, []);

  const refreshInvoices = () => setInvoices(getInvoices());
  const refreshTemplates = () => setTemplates(getTemplates());

  // ---- Backup / restore ----

  const handleExportBackup = () => {
    try {
      const { invoices: ni, templates: nt } = exportBackup();
      flashSaveMessage(`Backed up ${ni} invoice(s), ${nt} template(s)`);
    } catch (err) {
      alert("Export failed: " + (err as Error).message);
    }
  };

  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file) return;
    try {
      const { invoices: ni, templates: nt } = await importBackup(file);
      refreshInvoices();
      refreshTemplates();
      flashSaveMessage(`Restored ${ni} invoice(s), ${nt} template(s)`);
    } catch (err) {
      alert("Import failed: " + (err as Error).message);
    }
  };

  const flashSaveMessage = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(""), 2000);
  };

  // ---- Invoice handlers ----

  const handleNewInvoice = () => {
    try {
      const inv = createDefaultInvoice();
      setCurrentInvoice(inv);
      setView("edit-invoice");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("Error creating invoice: " + (err as Error).message);
    }
  };

  const handleSelectInvoice = (id: string) => {
    const inv = getInvoice(id);
    if (inv) {
      setCurrentInvoice(inv);
      setView("edit-invoice");
    }
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm("Delete this invoice?")) {
      deleteInvoice(id);
      refreshInvoices();
    }
  };

  const handleDuplicateInvoice = (id: string) => {
    const copy = duplicateInvoice(id);
    if (copy) {
      setCurrentInvoice(copy);
      setView("edit-invoice");
    }
  };

  // ---- Template handlers ----

  const handleNewTemplate = () => {
    const t = createDefaultTemplate();
    setCurrentInvoice(templateToInvoiceShape(t));
    setCurrentTemplateName(t.name);
    setView("edit-template");
  };

  const handleSelectTemplate = (id: string) => {
    const t = getTemplate(id);
    if (t) {
      setCurrentInvoice(templateToInvoiceShape(t));
      setCurrentTemplateName(t.name);
      setView("edit-template");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Delete this template?")) {
      deleteTemplate(id);
      refreshTemplates();
    }
  };

  const handleUseTemplate = (id: string) => {
    const t = getTemplate(id);
    if (!t) return;
    const inv = createInvoiceFromTemplate(t);
    setCurrentInvoice(inv);
    setView("edit-invoice");
    setTab("invoices");
  };

  const handleSaveTemplate = () => {
    if (!currentInvoice) return;
    if (!currentTemplateName.trim()) {
      alert("Please enter a template name before saving.");
      return;
    }
    const t = invoiceShapeToTemplate(currentInvoice, currentTemplateName.trim());
    saveTemplate(t);
    refreshTemplates();
    flashSaveMessage("Template saved!");
  };

  // ---- Shared handlers ----

  const handleBack = () => {
    refreshInvoices();
    refreshTemplates();
    setView("list");
    setCurrentInvoice(null);
    setCurrentTemplateName("");
  };

  const handleInvoiceSaved = () => {
    flashSaveMessage("Invoice saved!");
    refreshInvoices();
  };

  const handleSaveInvoiceAsTemplate = () => {
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
    saveTemplate(t);
    refreshTemplates();
    flashSaveMessage("Saved as template!");
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
        {view === "list" ? (
          tab === "receipts" ? (
            <CardReceiptsTab />
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
