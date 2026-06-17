// Types for the Card Receipts (quarterly gathering) tab.

export interface StatementCharge {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // positive = money spent
  currency: string;
}

export interface ExtractedReceipt {
  vendor: string;
  date: string; // ISO yyyy-mm-dd, "" if not found
  total: number;
  currency: string;
  documentType: "invoice" | "receipt" | "other";
  notes: string;
}

export interface ReceiptFileResult {
  fileName: string;
  extracted: ExtractedReceipt | null;
  error?: string;
}

export type MatchConfidence = "high" | "medium" | "low";

export interface ChargeMatch {
  chargeIndex: number;
  // Index into the receipts array, or -1 when no receipt was found for this charge.
  receiptIndex: number;
  confidence: MatchConfidence;
  reason: string;
}

export interface MatchResponse {
  matches: ChargeMatch[];
}
