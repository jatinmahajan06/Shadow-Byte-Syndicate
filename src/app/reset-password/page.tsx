"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing reset authorization token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full cyber-panel p-8 rounded-lg border border-brand-red text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-brand-red mx-auto" />
          <h2 className="text-lg font-bold text-white font-mono">Invalid Reset Link</h2>
          <p className="text-xs text-brand-gray-muted">
            The password reset authorization token is missing or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block px-4 py-2 bg-brand-surface hover:bg-brand-red text-white text-xs font-mono rounded"
          >
            Request New Reset Token
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full cyber-panel p-8 rounded-lg border border-brand-border space-y-6 relative">
        <div className="corner-bracket-tl"></div>
        <div className="corner-bracket-tr"></div>
        <div className="corner-bracket-bl"></div>
        <div className="corner-bracket-br"></div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Set New Password</h2>
          <p className="text-xs text-brand-gray-muted mt-1">
            Enter a new secure password of at least 8 characters.
          </p>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded text-xs font-mono text-emerald-400 space-y-3">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password successfully updated!</span>
            </div>
            <p className="text-brand-gray-text text-[11px]">
              All prior sessions have been invalidated. You may now log in with your new password.
            </p>
            <div className="pt-2">
              <Link
                href="/login/student"
                className="inline-block px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded font-bold"
              >
                Go to Login Portal &gt;
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded text-brand-redBright flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-brand-gray-dim mb-1">New Password (Min 8 chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>UPDATE SECURE PASSWORD</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center font-mono text-xs text-brand-red">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>VALIDATING AUTHORIZATION TOKEN...</span>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
