"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevNotice(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request.");
      }

      setMessage(data.message);
      if (data.devNotice) {
        setDevNotice(data.devNotice);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error processing password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full cyber-panel p-8 rounded-lg border border-brand-border space-y-6 relative">
        <div className="corner-bracket-tl"></div>
        <div className="corner-bracket-tr"></div>
        <div className="corner-bracket-bl"></div>
        <div className="corner-bracket-br"></div>

        <div>
          <Link
            href="/login/student"
            className="inline-flex items-center space-x-1.5 text-xs font-mono text-brand-gray-dim hover:text-white mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">Password Recovery</h2>
          <p className="text-xs text-brand-gray-muted mt-1">
            Enter your registered email address to receive single-use password reset authorization.
          </p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded text-xs font-mono text-emerald-400 space-y-2">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
            {devNotice && (
              <p className="text-[11px] text-brand-gray-dim pt-1 border-t border-emerald-900/60">
                {devNotice}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono text-brand-redBright flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-brand-gray-dim mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="identity@shadowbyte.club"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-xs font-mono text-white placeholder-brand-gray-dim focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>DISPATCH RESET AUTHORIZATION</span>
          </button>
        </form>
      </div>
    </div>
  );
}
