"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "password" | "code-request" | "code-verify";

export default function Login() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setError(error.message);
    // On success the app's auth listener signs you in.
  };

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setMode("code-verify");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!token) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
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

        {mode === "password" && (
          <>
            <p className="text-sm text-gray-500 mb-6">Sign in to access your invoices.</p>
            <form onSubmit={signInPassword} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="button"
                onClick={() => { setMode("code-request"); setError(""); }}
                className="w-full text-gray-400 hover:text-gray-600 text-xs pt-1"
              >
                Email me a code instead
              </button>
            </form>
          </>
        )}

        {mode === "code-request" && (
          <>
            <p className="text-sm text-gray-500 mb-6">We&apos;ll email you a 6-digit code.</p>
            <form onSubmit={requestCode} className="space-y-3">
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
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {busy ? "Sending…" : "Email me a code"}
              </button>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="button"
                onClick={() => { setMode("password"); setError(""); }}
                className="w-full text-gray-400 hover:text-gray-600 text-xs pt-1"
              >
                Use password instead
              </button>
            </form>
          </>
        )}

        {mode === "code-verify" && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            <form onSubmit={verifyCode} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {busy ? "Verifying…" : "Sign in"}
              </button>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="button"
                onClick={() => { setMode("password"); setCode(""); setError(""); }}
                className="w-full text-gray-400 hover:text-gray-600 text-xs pt-1"
              >
                Back to password sign-in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
