"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Surfaced clearly in the console if env vars are missing (e.g. not set in Vercel).
  console.error(
    "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const isSupabaseConfigured = Boolean(url && key);

// Single browser client. When env vars are missing (e.g. a build before they're
// set in Vercel), fall back to a syntactically-valid placeholder so createClient
// doesn't throw during prerendering — the UI gates on isSupabaseConfigured and
// never actually calls this client in that state.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
