import {
  CLAUDE_MODEL,
  getClaude,
  parseJsonResponse,
  errorResponse,
} from "@/lib/claude";
import { StatementCharge } from "@/types/receipts";

const SCHEMA = {
  type: "object",
  properties: {
    charges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Transaction date in ISO format (yyyy-mm-dd)",
          },
          description: {
            type: "string",
            description: "Merchant / transaction description as it appears on the statement",
          },
          amount: {
            type: "number",
            description: "Amount spent as a positive number",
          },
          currency: {
            type: "string",
            description: "ISO 4217 currency code, e.g. EUR",
          },
        },
        required: ["date", "description", "amount", "currency"],
        additionalProperties: false,
      },
    },
  },
  required: ["charges"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const { csv } = (await request.json()) as { csv: string };
    if (!csv?.trim()) {
      return Response.json({ error: "Empty statement file" }, { status: 400 });
    }

    const client = getClaude();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system:
        "You parse credit/debit card statement exports. Statements may be in any language " +
        "(Finnish bank exports are common: e.g. OP, Nordea, S-Pankki, with semicolon-separated " +
        "columns, dd.mm.yyyy dates, and decimal commas). Extract every purchase/charge row. " +
        "Skip payments toward the card balance, refunds/credits, interest, header and summary rows. " +
        "Amounts on statements are often negative for purchases - return them as positive numbers.",
      messages: [
        {
          role: "user",
          content: `Parse this card statement and return all charges:\n\n${csv}`,
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
    });

    const { charges } = parseJsonResponse<{ charges: StatementCharge[] }>(message);
    return Response.json({ charges });
  } catch (err) {
    return errorResponse(err);
  }
}
