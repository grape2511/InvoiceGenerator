import {
  CLAUDE_MODEL,
  getClaude,
  parseJsonResponse,
  errorResponse,
} from "@/lib/claude";
import {
  StatementCharge,
  ReceiptFileResult,
  MatchResponse,
} from "@/types/receipts";

const SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          chargeIndex: {
            type: "integer",
            description: "Index of the charge in the provided charges array",
          },
          receiptIndex: {
            type: "integer",
            description:
              "Index of the matching receipt in the provided receipts array, or -1 if no receipt matches this charge",
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          reason: {
            type: "string",
            description: "One short sentence explaining the match or why none was found",
          },
        },
        required: ["chargeIndex", "receiptIndex", "confidence", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["matches"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const { charges, receipts } = (await request.json()) as {
      charges: StatementCharge[];
      receipts: ReceiptFileResult[];
    };
    if (!charges?.length || !receipts?.length) {
      return Response.json(
        { error: "Both charges and receipts are required" },
        { status: 400 }
      );
    }

    const chargeList = charges
      .map(
        (c, i) =>
          `${i}: ${c.date} | ${c.description} | ${c.amount.toFixed(2)} ${c.currency}`
      )
      .join("\n");
    const receiptList = receipts
      .map((r, i) => {
        if (!r.extracted) return `${i}: ${r.fileName} | extraction failed`;
        const e = r.extracted;
        return `${i}: ${r.fileName} | vendor: ${e.vendor} | date: ${e.date || "unknown"} | total: ${e.total.toFixed(2)} ${e.currency}`;
      })
      .join("\n");

    const client = getClaude();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system:
        "You reconcile card statement charges against purchase invoices/receipts for quarterly " +
        "bookkeeping. Statement descriptions rarely equal vendor names exactly (e.g. 'AMZN MKTP' " +
        "vs 'Amazon', 'PAYPAL *SPOTIFY' vs 'Spotify'). Card settlement dates can lag purchase " +
        "dates by a few days, and foreign-currency charges may differ slightly in amount after " +
        "conversion. Each receipt should match at most one charge. Return exactly one entry per " +
        "charge, with receiptIndex -1 when nothing matches.",
      messages: [
        {
          role: "user",
          content: `Match each charge to its receipt.\n\nCHARGES:\n${chargeList}\n\nRECEIPTS:\n${receiptList}`,
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
    });

    const result = parseJsonResponse<MatchResponse>(message);
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
