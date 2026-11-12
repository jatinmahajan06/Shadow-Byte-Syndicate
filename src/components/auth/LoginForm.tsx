"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { ROLES, UserRole } from "@/lib/constants";
import { loginWithEmailPortal, signInWithGooglePortal } from "@/firebase/auth";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  role: UserRole;
  portalTitle: string;
  portalSubtitle: string;
  badgeText: string;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.7 7.6l3.2 2.3C7.7 7.9 9.7 6.5 12 6.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5c-3.7 0-6.8 2.1-8.3 5.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.6-1.9 1-3.3 1-3.9 0-7.2-2.6-8.3-6.2l-3.2 2.4c1.5 4.4 5.7 7.5 11.5 7.5z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1 2.2-2 2.9l2.9 2.4c1.7-1.6 2.7-4 2.7-7.6z"
      />
    </svg>
  );
}

function LoginFormContent({ role, portalTitle, portalSubtitle, badgeText }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { refreshSessionToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await loginWithEmailPortal(email, password, role);
      await refreshSessionToken();

      const targetUrl = redirect || data.redirectUrl || "/";
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const data = await signInWithGooglePortal(role);
      await refreshSessionToken();

      const targetUrl = redirect || data.redirectUrl || "/";
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 cyber-panel p-8 rounded-lg border border-brand-border relative">
        <div className="corner-bracket-tl"></div>
        <div className="corner-bracket-tr"></div>
        <div className="corner-bracket-bl"></div>
        <div className="corner-bracket-br"></div>

        {/* Portal Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full border border-brand-red/50 overflow-hidden bg-brand-black p-0.5 shadow-red-glow-sm">
            <Image
              src="/assets/brand/shield-emblem.png"
              alt="Shadow Byte Syndicate SB Shield Emblem"
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          </div>

          <div className="inline-block px-2.5 py-0.5 bg-brand-surface border border-brand-border rounded text-[11px] font-mono text-brand-redBright font-semibold">
            {badgeText}
          </div>

          <h2 className="text-2xl font-extrabold text-white tracking-tight">{portalTitle}</h2>
          <p className="text-xs text-brand-gray-muted">{portalSubtitle}</p>
        </div>

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
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-xs font-mono text-white placeholder-brand-gray-dim focus:outline-none focus:border-brand-red disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono text-brand-gray-dim">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-mono text-brand-red hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-xs font-mono text-white placeholder-brand-gray-dim focus:outline-none focus:border-brand-red disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>AUTHENTICATE & ENTER PORTAL</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-brand-border/70"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono text-brand-gray-dim uppercase">
            OR FEDERATED AUTH
          </span>
          <div className="flex-grow border-t border-brand-border/70"></div>
        </div>

        {/* Google Sign-In Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full py-2.5 bg-brand-surface hover:bg-brand-card border border-brand-border hover:border-brand-red/60 text-white text-xs font-mono font-semibold rounded flex items-center justify-center space-x-2.5 transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
            ) : (
              <GoogleIcon />
            )}
            <span>CONTINUE WITH GOOGLE</span>
          </button>
          {role !== ROLES.STUDENT && (
            <p className="text-[10px] font-mono text-brand-gray-dim text-center">
              Privileged portal: Google Sign-In works only for existing authorized {role.replace("_", " ")} accounts.
            </p>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-brand-border/60 text-center space-y-2 text-xs font-mono text-brand-gray-dim">
          {role === ROLES.STUDENT && (
            <p>
              New collegiate member?{" "}
              <Link href="/register" className="text-white hover:text-brand-redBright font-semibold underline">
                Create Student Account
              </Link>
            </p>
          )}

          <div className="flex items-center justify-center space-x-3 text-[11px] pt-2">
            <span className="text-brand-gray-dim">Other Portals:</span>
            {role !== ROLES.STUDENT && (
              <Link href="/login/student" className="text-brand-gray-text hover:text-white">
                Student
              </Link>
            )}
            {role !== ROLES.COORDINATOR && (
              <Link href="/login/coordinator" className="text-brand-gray-text hover:text-white">
                Coordinator
              </Link>
            )}
            {role !== ROLES.SUPER_ADMIN && (
              <Link href="/login/super-admin" className="text-brand-gray-text hover:text-white">
                Super Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs font-mono text-brand-red">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>CONNECTING TO SECURE AUTH PORTAL...</span>
        </div>
      }
    >
      <LoginFormContent {...props} />
    </Suspense>
  );
}
