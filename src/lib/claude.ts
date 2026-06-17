// Server-only helpers for the Card Receipts agent routes.
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError();
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
}

// Extracts the JSON payload from a structured-output response.
export function parseJsonResponse<T>(message: Anthropic.Message): T {
  const text = message.content
    .filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    )
    .map((block) => block.text)
    .join("");
  return JSON.parse(text) as T;
}

export function errorResponse(err: unknown): Response {
  if (err instanceof MissingApiKeyError) {
    return Response.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof Anthropic.APIError) {
    return Response.json(
      { error: `Claude API error (${err.status}): ${err.message}` },
      { status: 502 }
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return Response.json({ error: message }, { status: 500 });
}
