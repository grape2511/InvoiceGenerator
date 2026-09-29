"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "google" | "password" | "code-request" | "code-verify";

export default function Login() {
  const [mode, setMode] = useState<Mode>("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signInGoogle = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success the browser redirects to Google, then back here signed in.
  };

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

  const errorBox = error && (
    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
  );
  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const primaryBtn =
    "w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm";
  const linkBtn = "w-full text-gray-400 hover:text-gray-600 text-xs pt-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 text-gray-800 font-bold text-xl mb-1">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Invoice Generator
        </div>

        {mode === "google" && (
          <>
            <p className="text-sm text-gray-500 mb-6">Sign in to access your invoices.</p>
            <button
              onClick={signInGoogle}
              disabled={busy}
              className="w-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              {busy ? "Redirecting…" : "Continue with Google"}
            </button>
            {errorBox}
            <button
              type="button"
              onClick={() => { setMode("password"); setError(""); }}
              className={linkBtn + " mt-3"}
            >
              Other sign-in options
            </button>
          </>
        )}

        {mode === "password" && (
          <>
            <p className="text-sm text-gray-500 mb-6">Sign in with email and password.</p>
            <form onSubmit={signInPassword} className="space-y-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className={inputCls} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required className={inputCls} />
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {errorBox}
              <button type="button" onClick={() => { setMode("code-request"); setError(""); }} className={linkBtn}>
                Email me a code instead
              </button>
              <button type="button" onClick={() => { setMode("google"); setError(""); }} className={linkBtn}>
                Back to Google sign-in
              </button>
            </form>
          </>
        )}

        {mode === "code-request" && (
          <>
            <p className="text-sm text-gray-500 mb-6">We&apos;ll email you a 6-digit code.</p>
            <form onSubmit={requestCode} className="space-y-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className={inputCls} />
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? "Sending…" : "Email me a code"}
              </button>
              {errorBox}
              <button type="button" onClick={() => { setMode("google"); setError(""); }} className={linkBtn}>
                Back to Google sign-in
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
              <input type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required autoFocus className={inputCls + " text-lg tracking-widest text-center"} />
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? "Verifying…" : "Sign in"}
              </button>
              {errorBox}
              <button type="button" onClick={() => { setMode("google"); setCode(""); setError(""); }} className={linkBtn}>
                Back to Google sign-in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
