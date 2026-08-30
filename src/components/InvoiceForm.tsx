"use client";

import { useState, useRef, useCallback } from "react";
import {
  Invoice,
  LineItem,
  CURRENCIES,
  calculateSubtotal,
  calculateVat,
  calculateTotal,
} from "@/types/invoice";
import { saveInvoice } from "@/lib/storage";
import DatePicker from "@/components/DatePicker";
import NumericInput from "@/components/NumericInput";

interface Props {
  invoice: Invoice;
  onChange: (invoice: Invoice) => void;
  onSaved?: () => void;
  mode?: "invoice" | "template";
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
  onSave?: () => void;
  onSaveAsTemplate?: () => void;
  onDiscard?: () => void;
}

export default function InvoiceForm({
  invoice,
  onChange,
  onSaved,
  mode = "invoice",
  templateName = "",
  onTemplateNameChange,
  onSave,
  onSaveAsTemplate,
  onDiscard,
}: Props) {
  const isTemplate = mode === "template";
  const [showDiscount, setShowDiscount] = useState(invoice.discountValue > 0);
  const [showShipping, setShowShipping] = useState(invoice.shipping > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const curr = CURRENCIES[invoice.currency] || CURRENCIES.EUR;

  const update = useCallback(
    (fields: Partial<Invoice>) => {
      onChange({ ...invoice, ...fields });
    },
    [invoice, onChange]
  );

  const updateItem = (id: string, fields: Partial<LineItem>) => {
    update({
      items: invoice.items.map((item) =>
        item.id === id ? { ...item, ...fields } : item
      ),
    });
  };

  const addItem = () => {
    update({
      items: [
        ...invoice.items,
        { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 },
      ],
    });
  };

  const removeItem = (id: string) => {
    if (invoice.items.length <= 1) return;
    update({ items: invoice.items.filter((item) => item.id !== id) });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const subtotal = calculateSubtotal(invoice.items);
  const vatAmount = calculateVat(subtotal, invoice.vatRate);
  const total = calculateTotal(
    subtotal,
    vatAmount,
    invoice.discountValue,
    invoice.discountType,
    invoice.shipping
  );

  const discountAmount =
    invoice.discountType === "percentage"
      ? subtotal * (invoice.discountValue / 100)
      : invoice.discountValue;

  const fmt = (n: number) =>
    `${curr.symbol}${n.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleSave = async () => {
    if (onSave) {
      onSave();
    } else {
      try {
        await saveInvoice(invoice);
        onSaved?.();
      } catch (err) {
        alert("Save failed: " + (err as Error).message);
      }
    }
  };

  const handleDownloadPdf = async () => {
    const el = invoiceRef.current;
    if (!el) return;

    // Persist before exporting, but still produce the PDF even if the save fails.
    try {
      await saveInvoice(invoice);
      onSaved?.();
    } catch (err) {
      console.error("Save before PDF failed:", err);
    }

    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");

    // Create a clone for PDF rendering with inputs replaced by plain text
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = el.offsetWidth + "px";
    document.body.appendChild(clone);

    // Hide elements marked as no-print (buttons, icons, etc.)
    clone.querySelectorAll("[data-no-print]").forEach((node) => {
      (node as HTMLElement).style.display = "none";
    });

    // Replace all inputs and textareas with styled divs
    clone.querySelectorAll("input, textarea").forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      const div = document.createElement("div");
      div.style.cssText = window.getComputedStyle(el).cssText;
      div.style.overflow = "visible";
      div.style.height = "auto";
      div.style.minHeight = "0";
      div.style.whiteSpace = "pre-wrap";
      div.style.wordBreak = "break-word";
      div.style.border = "none";
      div.style.padding = el.tagName === "TEXTAREA" ? "8px" : "4px 8px";
      div.style.background = "transparent";
      div.style.fontSize = window.getComputedStyle(el).fontSize;
      div.style.fontFamily = window.getComputedStyle(el).fontFamily;
      div.style.lineHeight = "1.5";
      div.textContent = el.value;
      el.parentNode?.replaceChild(div, el);
    });

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    let imgWidth = usableWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Scale down to fit on one page if needed
    if (imgHeight > usableHeight) {
      const scale = usableHeight / imgHeight;
      imgWidth *= scale;
      imgHeight = usableHeight;
    }

    // Center horizontally
    const xOffset = (pageWidth - imgWidth) / 2;
    pdf.addImage(imgData, "PNG", xOffset, margin, imgWidth, imgHeight);

    pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="flex gap-6 max-w-[1200px] mx-auto">
      {/* Invoice Preview / Editable Area */}
      <div className="flex-1">
        <div
          ref={invoiceRef}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-10"
          style={{ minHeight: "1100px" }}
        >
          {/* Header: Logo + Invoice Number + Dates */}
          <div className="flex justify-between items-start mb-8">
            {/* Logo */}
            <div>
              {invoice.logoUrl ? (
                <div className="relative group">
                  <img
                    src={invoice.logoUrl}
                    alt="Logo"
                    className="h-52 w-52 object-contain rounded-full cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <button
                    data-no-print
                    onClick={() => update({ logoUrl: "" })}
                    className="absolute -top-2 -left-2 bg-gray-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-52 w-52 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 text-xs text-center"
                >
                  + Add Logo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Invoice title + number, or Template title + name */}
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-700 tracking-wide mb-1">
                {isTemplate ? "TEMPLATE" : "INVOICE"}
              </h1>
              <div className="flex items-center justify-end gap-1 text-gray-500">
                {isTemplate ? (
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => onTemplateNameChange?.(e.target.value)}
                    placeholder="Template name (e.g. Acme Co)"
                    className="border border-gray-200 rounded px-2 py-1 text-right w-56 text-sm"
                  />
                ) : (
                  <>
                    <span>#</span>
                    <input
                      type="text"
                      value={invoice.invoiceNumber}
                      onChange={(e) => update({ invoiceNumber: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-right w-40 text-sm"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sender info + Dates */}
          <div className="flex justify-between mb-8">
            {/* Sender */}
            <div className="border border-gray-200 rounded p-3 w-[340px]">
              <textarea
                value={`${invoice.senderName}\n${invoice.senderAddress}\n${invoice.senderCity}\n${invoice.senderCountry}\n${invoice.senderPhone}`}
                onChange={(e) => {
                  const lines = e.target.value.split("\n");
                  update({
                    senderName: lines[0] || "",
                    senderAddress: lines[1] || "",
                    senderCity: lines[2] || "",
                    senderCountry: lines[3] || "",
                    senderPhone: lines[4] || "",
                  });
                }}
                rows={5}
                className="w-full text-sm resize-none"
                placeholder="Your company name and address"
              />
            </div>

            {/* Dates (invoice mode only) */}
            {isTemplate ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <label className="text-gray-500 w-32 text-right">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={invoice.paymentTerms}
                    onChange={(e) =>
                      update({ paymentTerms: e.target.value })
                    }
                    placeholder="e.g. 14 days"
                    className="border border-gray-200 rounded px-2 py-1 w-40"
                  />
                </div>
                <p className="text-xs text-gray-400 italic max-w-[260px] text-right ml-auto">
                  Date, due date, and PO are filled in when you create an
                  invoice from this template.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <label className="text-gray-500 w-32 text-right">Date</label>
                  <DatePicker
                    value={invoice.date}
                    onChange={(val) => update({ date: val })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-gray-500 w-32 text-right">
                    Payment Due
                  </label>
                  <DatePicker
                    value={invoice.paymentDue}
                    onChange={(val) => update({ paymentDue: val })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-gray-500 w-32 text-right">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={invoice.poNumber}
                    onChange={(e) => update({ poNumber: e.target.value })}
                    className="border border-gray-200 rounded px-2 py-1 w-40"
                  />
                </div>
                {/* Balance due */}
                <div className="flex items-center gap-3 bg-gray-600 text-white rounded px-3 py-2 mt-2">
                  <span className="w-32 text-right font-medium">Balance Due</span>
                  <span className="w-40 text-right font-bold text-lg">
                    {fmt(total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bill To / Ship To */}
          <div className="flex gap-8 mb-8">
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                Bill To
              </label>
              <textarea
                value={invoice.billTo}
                onChange={(e) => update({ billTo: e.target.value })}
                rows={4}
                className="w-full border border-gray-200 rounded p-2 text-sm resize-none"
                placeholder="Who is this to?"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                Ship To
              </label>
              <textarea
                value={invoice.shipTo}
                onChange={(e) => update({ shipTo: e.target.value })}
                rows={4}
                className="w-full border border-gray-200 rounded p-2 text-sm resize-none"
                placeholder="(optional)"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <div className="bg-gray-700 text-white rounded-t-md grid grid-cols-12 gap-2 px-4 py-2 text-sm font-medium">
              <div className="col-span-6">Item</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 items-center group"
              >
                <div className="col-span-6">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    placeholder="Description of item/service..."
                  />
                </div>
                <div className="col-span-2">
                  <NumericInput
                    value={item.quantity}
                    onChange={(val) => updateItem(item.id, { quantity: val })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center border border-gray-200 rounded">
                    <span className="text-gray-400 text-sm pl-2">
                      {curr.symbol}
                    </span>
                    <NumericInput
                      value={item.rate}
                      onChange={(val) => updateItem(item.id, { rate: val })}
                      className="w-full px-1 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm text-right flex-1">
                    {fmt(item.quantity * item.rate)}
                  </span>
                  {invoice.items.length > 1 && (
                    <button
                      data-no-print
                      onClick={() => removeItem(item.id)}
                      className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              data-no-print
              onClick={addItem}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded px-3 py-1"
            >
              + Line Item
            </button>
          </div>

          {/* Totals section + Business Details */}
          <div className="flex gap-8">
            {/* Left: Business Details + Bank Info */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Business Details:
                </label>
                <textarea
                  value={invoice.businessDetails}
                  onChange={(e) =>
                    update({ businessDetails: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded p-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Bank Info:
                </label>
                <textarea
                  value={invoice.bankInfo}
                  onChange={(e) => update({ bankInfo: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded p-2 text-sm resize-none"
                />
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Notes:
                </label>
                <textarea
                  value={invoice.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded p-2 text-sm resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Right: Totals */}
            <div className="w-[300px] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>

              {/* VAT */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">VAT</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={invoice.vatRate}
                    onChange={(e) =>
                      update({ vatRate: parseFloat(e.target.value) || 0 })
                    }
                    className="border border-gray-200 rounded px-2 py-1 w-16 text-right"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT ({invoice.vatRate}%)</span>
                <span>{fmt(vatAmount)}</span>
              </div>

              {/* Discount toggle */}
              {!showDiscount ? (
                <button
                  data-no-print
                  onClick={() => setShowDiscount(true)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs"
                >
                  + Discount
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500">Discount</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={invoice.discountValue}
                        onChange={(e) =>
                          update({
                            discountValue:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="border border-gray-200 rounded px-2 py-1 w-16 text-right"
                        min="0"
                      />
                      <select
                        value={invoice.discountType}
                        onChange={(e) =>
                          update({
                            discountType: e.target.value as
                              | "percentage"
                              | "flat",
                          })
                        }
                        className="border border-gray-200 rounded px-1 py-1 text-xs"
                      >
                        <option value="percentage">%</option>
                        <option value="flat">{curr.symbol}</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span></span>
                    <span>-{fmt(discountAmount)}</span>
                  </div>
                </div>
              )}

              {/* Shipping toggle */}
              {!showShipping ? (
                <button
                  data-no-print
                  onClick={() => setShowShipping(true)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs"
                >
                  + Shipping
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <div className="flex items-center border border-gray-200 rounded">
                    <span className="text-gray-400 text-sm pl-2">
                      {curr.symbol}
                    </span>
                    <input
                      type="number"
                      value={invoice.shipping}
                      onChange={(e) =>
                        update({
                          shipping: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="px-1 py-1 w-20 text-right"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-[200px] space-y-4 shrink-0">
        {!isTemplate && (
          <button
            onClick={handleDownloadPdf}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download PDF
          </button>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isTemplate ? "Save Template" : "Save Invoice"}
        </button>

        {!isTemplate && onSaveAsTemplate && (
          <button
            onClick={onSaveAsTemplate}
            className="w-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                d="M5 5a2 2 0 012-2h8.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z M9 3v4h6V3"
              />
            </svg>
            Save as Template
          </button>
        )}

        {onDiscard && (
          <button
            onClick={onDiscard}
            className="w-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {isTemplate ? "Discard Template" : "Discard Invoice"}
          </button>
        )}

        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">
            Currency
          </label>
          <select
            value={invoice.currency}
            onChange={(e) => update({ currency: e.target.value })}
            className="w-full border border-gray-200 rounded px-2 py-2 text-sm"
          >
            {Object.entries(CURRENCIES).map(([code, { label }]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
