"use client";

import { useState, useEffect, useCallback } from "react";
import { Invoice, createDefaultInvoice } from "@/types/invoice";
import { getInvoices, getInvoice, deleteInvoice, duplicateInvoice } from "@/lib/storage";
import InvoiceForm from "@/components/InvoiceForm";
import InvoiceList from "@/components/InvoiceList";

type View = "list" | "edit";

export default function Home() {
  const [view, setView] = useState<View>("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setInvoices(getInvoices());
  }, []);

  const refreshList = () => setInvoices(getInvoices());

  const handleNew = () => {
    try {
      const inv = createDefaultInvoice();
      setCurrentInvoice(inv);
      setView("edit");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("Error creating invoice: " + (err as Error).message);
    }
  };

  const handleSelect = (id: string) => {
    const inv = getInvoice(id);
    if (inv) {
      setCurrentInvoice(inv);
      setView("edit");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this invoice?")) {
      deleteInvoice(id);
      refreshList();
    }
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateInvoice(id);
    if (copy) {
      setCurrentInvoice(copy);
      setView("edit");
    }
  };

  const handleBack = () => {
    refreshList();
    setView("list");
    setCurrentInvoice(null);
  };

  const handleSaved = () => {
    setSaveMessage("Invoice saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleInvoiceChange = useCallback((updated: Invoice) => {
    setCurrentInvoice(updated);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* App name / home link */}
          <button
            onClick={view === "edit" ? handleBack : undefined}
            className={`flex items-center gap-2 text-xl font-bold ${
              view === "edit"
                ? "text-indigo-600 hover:text-indigo-800 cursor-pointer"
                : "text-gray-800 cursor-default"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoices
          </button>

          {/* Breadcrumb for edit view */}
          {view === "edit" && (
            <>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-500 text-sm">
                #{currentInvoice?.invoiceNumber || ""}
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
          {view === "edit" && (
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg py-2 px-4 text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All Invoices
            </button>
          )}
          <button
            onClick={handleNew}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {view === "list" ? (
          <InvoiceList
            invoices={invoices}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ) : currentInvoice ? (
          <InvoiceForm
            invoice={currentInvoice}
            onChange={handleInvoiceChange}
            onSaved={handleSaved}
          />
        ) : null}
      </main>
    </div>
  );
}
