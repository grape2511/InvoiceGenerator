import Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_MODEL,
  getClaude,
  parseJsonResponse,
  errorResponse,
} from "@/lib/claude";
import { ExtractedReceipt } from "@/types/receipts";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const SCHEMA = {
  type: "object",
  properties: {
    vendor: {
      type: "string",
      description: "The merchant/vendor name that issued this invoice or receipt",
    },
    date: {
      type: "string",
      description:
        "Invoice/purchase date in ISO format (yyyy-mm-dd), or empty string if not found",
    },
    total: {
      type: "number",
      description: "The grand total paid, including VAT",
    },
    currency: {
      type: "string",
      description: "ISO 4217 currency code, e.g. EUR",
    },
    documentType: {
      type: "string",
      enum: ["invoice", "receipt", "other"],
    },
    notes: {
      type: "string",
      description:
        "Anything unusual worth flagging (multiple pages, partial amounts, unclear total), else empty string",
    },
  },
  required: ["vendor", "date", "total", "currency", "documentType", "notes"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const data = bytes.toString("base64");

    let documentBlock: Anthropic.ContentBlockParam;
    if (file.type === "application/pdf") {
      documentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      };
    } else if (IMAGE_TYPES.has(file.type)) {
      documentBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data,
        },
      };
    } else {
      return Response.json(
        { error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    const client = getClaude();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system:
        "You extract structured data from purchase invoices and receipts. Documents may be in " +
        "any language (Finnish and English are common). Always return the grand total actually " +
        "paid, VAT included.",
      messages: [
        {
          role: "user",
          content: [
            documentBlock,
            {
              type: "text",
              text: `Extract the vendor, date, and total from this document (file name: ${file.name}).`,
            },
          ],
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
    });

    const extracted = parseJsonResponse<ExtractedReceipt>(message);
    return Response.json({ extracted });
  } catch (err) {
    return errorResponse(err);
  }
}
