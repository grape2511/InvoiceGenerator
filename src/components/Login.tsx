"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 text-gray-800 font-bold text-xl mb-1">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Invoice Generator
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to access your invoices. We&apos;ll email you a secure login
          link — no password needed.
        </p>

        {status === "sent" ? (
          <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-4">
            <p className="font-medium mb-1">Check your email</p>
            <p>
              We sent a login link to <strong>{email}</strong>. Open it on this
              device to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {status === "sending" ? "Sending…" : "Email me a login link"}
            </button>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
