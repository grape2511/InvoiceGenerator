"use client";

import { useRef, useState } from "react";
import {
  StatementCharge,
  ReceiptFileResult,
  ChargeMatch,
} from "@/types/receipts";

type Phase = "idle" | "running" | "done";

interface RunResults {
  charges: StatementCharge[];
  receipts: ReceiptFileResult[];
  matches: ChargeMatch[]; // empty when no statement was provided
}

const ACCEPTED_RECEIPT_TYPES = ".pdf,.png,.jpg,.jpeg,.gif,.webp";
const EXTRACT_CONCURRENCY = 3;

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-orange-50 text-orange-700",
};

function sanitizeForFileName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function CardReceiptsTab() {
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<RunResults | null>(null);
  const [runError, setRunError] = useState("");
  // Mirrors receiptFiles at run time so download/zip still works if the
  // user changes the selection after a run.
  const runFilesRef = useRef<File[]>([]);

  const addLog = (line: string) => setLog((prev) => [...prev, line]);

  const handleAddReceipts = (list: FileList | null) => {
    if (!list) return;
    setReceiptFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const added = Array.from(list).filter(
        (f) => !existing.has(f.name + f.size)
      );
      return [...prev, ...added];
    });
  };

  const removeReceipt = (index: number) =>
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));

  const runAgent = async () => {
    setPhase("running");
    setLog([]);
    setResults(null);
    setRunError("");
    runFilesRef.current = receiptFiles;

    try {
      // 1. Parse the statement (if provided)
      let charges: StatementCharge[] = [];
      if (statementFile) {
        addLog(`Reading statement "${statementFile.name}"…`);
        const csv = await statementFile.text();
        const data = await postJson<{ charges: StatementCharge[] }>(
          "/api/agent/parse-statement",
          { csv }
        );
        charges = data.charges;
        addLog(`Found ${charges.length} card charges on the statement.`);
      } else {
        addLog("No statement uploaded — extracting receipts only.");
      }

      // 2. Extract each receipt (small concurrency pool)
      addLog(`Extracting ${receiptFiles.length} receipt file(s)…`);
      const receipts: ReceiptFileResult[] = new Array(receiptFiles.length);
      let next = 0;
      const worker = async () => {
        while (next < receiptFiles.length) {
          const i = next++;
          const file = receiptFiles[i];
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/agent/extract-receipt", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Extraction failed");
            receipts[i] = { fileName: file.name, extracted: data.extracted };
            const e = data.extracted;
            addLog(
              `✓ ${file.name} → ${e.vendor}, ${e.date || "no date"}, ${e.total.toFixed(2)} ${e.currency}`
            );
          } catch (err) {
            receipts[i] = {
              fileName: file.name,
              extracted: null,
              error: err instanceof Error ? err.message : String(err),
            };
            addLog(`✗ ${file.name} — ${receipts[i].error}`);
          }
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(EXTRACT_CONCURRENCY, receiptFiles.length) },
          worker
        )
      );

      // 3. Match receipts to charges
      let matches: ChargeMatch[] = [];
      if (charges.length > 0 && receipts.some((r) => r.extracted)) {
        addLog("Matching receipts to statement charges…");
        const data = await postJson<{ matches: ChargeMatch[] }>(
          "/api/agent/match",
          { charges, receipts }
        );
        matches = data.matches;
        const found = matches.filter((m) => m.receiptIndex >= 0).length;
        addLog(
          `Done. ${found}/${charges.length} charges have a receipt; ${charges.length - found} missing.`
        );
      } else {
        addLog("Done.");
      }

      setResults({ charges, receipts, matches });
      setPhase("done");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  };

  const exportCsv = () => {
    if (!results) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows: string[] = [];
    if (results.charges.length > 0) {
      rows.push(
        [
          "Charge date",
          "Description",
          "Amount",
          "Currency",
          "Receipt file",
          "Receipt vendor",
          "Receipt total",
          "Status",
          "Note",
        ]
          .map(esc)
          .join(",")
      );
      for (const m of results.matches) {
        const c = results.charges[m.chargeIndex];
        if (!c) continue;
        const r = m.receiptIndex >= 0 ? results.receipts[m.receiptIndex] : null;
        rows.push(
          [
            c.date,
            c.description,
            c.amount.toFixed(2),
            c.currency,
            r?.fileName ?? "",
            r?.extracted?.vendor ?? "",
            r?.extracted ? r.extracted.total.toFixed(2) : "",
            r ? `matched (${m.confidence})` : "MISSING RECEIPT",
            m.reason,
          ]
            .map(esc)
            .join(",")
        );
      }
    } else {
      rows.push(
        ["Receipt file", "Vendor", "Date", "Total", "Currency", "Note"]
          .map(esc)
          .join(",")
      );
      for (const r of results.receipts) {
        rows.push(
          [
            r.fileName,
            r.extracted?.vendor ?? "",
            r.extracted?.date ?? "",
            r.extracted ? r.extracted.total.toFixed(2) : "",
            r.extracted?.currency ?? "",
            r.error ?? r.extracted?.notes ?? "",
          ]
            .map(esc)
            .join(",")
        );
      }
    }
    const blob = new Blob(["﻿" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    triggerDownload(blob, "card-receipts.csv");
  };

  const downloadZip = async () => {
    if (!results) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const usedNames = new Set<string>();
    results.receipts.forEach((r, i) => {
      const file = runFilesRef.current[i];
      if (!file) return;
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf("."))
        : "";
      let name: string;
      if (r.extracted) {
        const e = r.extracted;
        name = `${e.date || "unknown-date"}_${sanitizeForFileName(e.vendor) || "unknown"}_${e.total.toFixed(2)}${ext}`;
      } else {
        name = `UNREADABLE_${sanitizeForFileName(file.name)}`;
      }
      while (usedNames.has(name)) name = `_${name}`;
      usedNames.add(name);
      zip.file(name, file);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, "card-receipts.zip");
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canRun = phase !== "running" && receiptFiles.length > 0;
  const missingCount =
    results?.matches.filter((m) => m.receiptIndex < 0).length ?? 0;
  const matchedReceiptIndices = new Set(
    results?.matches.map((m) => m.receiptIndex).filter((i) => i >= 0) ?? []
  );
  const unmatchedReceipts =
    results && results.charges.length > 0
      ? results.receipts
          .map((r, i) => ({ r, i }))
          .filter(({ r, i }) => r.extracted && !matchedReceiptIndices.has(i))
      : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Quarterly card receipts
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Upload the quarter&apos;s card statement and the pile of invoices/receipts
          you&apos;ve collected. The agent reads every document, matches each card
          charge to its receipt, and flags the charges that are still missing
          one — ready to send to your accountant.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Statement upload */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              1. Card statement (CSV)
              <span className="ml-2 text-xs font-normal text-gray-400">
                optional
              </span>
            </h3>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-sm file:font-medium hover:file:bg-indigo-100 file:cursor-pointer"
            />
            {statementFile ? (
              <p className="mt-2 text-xs text-gray-500">
                {statementFile.name}
                <button
                  onClick={() => setStatementFile(null)}
                  className="ml-2 text-red-400 hover:text-red-600"
                >
                  remove
                </button>
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Without a statement the agent only extracts and renames the
                receipts.
              </p>
            )}
          </div>

          {/* Receipts upload */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              2. Invoices &amp; receipts (PDF / images)
            </h3>
            <input
              type="file"
              accept={ACCEPTED_RECEIPT_TYPES}
              multiple
              onChange={(e) => {
                handleAddReceipts(e.target.files);
                e.target.value = "";
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-sm file:font-medium hover:file:bg-indigo-100 file:cursor-pointer"
            />
            {receiptFiles.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-gray-600 space-y-1">
                {receiptFiles.map((f, i) => (
                  <li key={f.name + f.size} className="flex justify-between gap-2">
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() => removeReceipt(i)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={runAgent}
            disabled={!canRun}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {phase === "running" ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Working…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run agent
              </>
            )}
          </button>
          {receiptFiles.length === 0 && (
            <span className="text-xs text-gray-400">
              Add at least one receipt to start.
            </span>
          )}
        </div>

        {runError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {runError}
          </p>
        )}
      </div>

      {/* Agent log */}
      {log.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-1 max-h-64 overflow-y-auto">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Results */}
      {phase === "done" && results && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={exportCsv}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm"
            >
              Export checklist (CSV)
            </button>
            <button
              onClick={downloadZip}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm"
            >
              Download receipts (ZIP, renamed)
            </button>
            {results.charges.length > 0 && (
              <span
                className={`text-sm font-medium ${missingCount > 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {missingCount > 0
                  ? `${missingCount} charge(s) missing a receipt`
                  : "All charges have receipts 🎉"}
              </span>
            )}
          </div>

          {results.charges.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Charge</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Receipt</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.matches.map((m) => {
                    const c = results.charges[m.chargeIndex];
                    if (!c) return null;
                    const r =
                      m.receiptIndex >= 0
                        ? results.receipts[m.receiptIndex]
                        : null;
                    return (
                      <tr
                        key={m.chargeIndex}
                        className={`border-b border-gray-100 ${r ? "" : "bg-red-50/50"}`}
                      >
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {c.date}
                        </td>
                        <td className="px-4 py-3">{c.description}</td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {c.amount.toLocaleString("fi-FI", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {c.currency}
                        </td>
                        <td className="px-4 py-3">
                          {r ? (
                            <span title={m.reason}>
                              <span className="font-medium">
                                {r.extracted?.vendor}
                              </span>
                              <span className="text-gray-400 text-xs block truncate max-w-[200px]">
                                {r.fileName}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r ? (
                            <span
                              title={m.reason}
                              className={`text-xs font-medium px-2 py-0.5 rounded ${CONFIDENCE_STYLES[m.confidence] || CONFIDENCE_STYLES.low}`}
                            >
                              {m.confidence}
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700">
                              missing
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {results.receipts.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3 truncate max-w-[220px]">
                        {r.fileName}
                      </td>
                      <td className="px-4 py-3">
                        {r.extracted?.vendor ?? (
                          <span className="text-red-500 text-xs">
                            {r.error || "unreadable"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.extracted?.date || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        {r.extracted
                          ? `${r.extracted.total.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${r.extracted.currency}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Extra receipts that matched no charge */}
          {unmatchedReceipts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">
                Receipts that matched no charge on this statement:
              </p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {unmatchedReceipts.map(({ r, i }) => (
                  <li key={i}>
                    {r.fileName} — {r.extracted!.vendor},{" "}
                    {r.extracted!.total.toFixed(2)} {r.extracted!.currency}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
