"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Building, Hash, Phone, Loader2, AlertCircle } from "lucide-react";
import { registerStudentAccount, signInWithGooglePortal } from "@/firebase/auth";
import { ROLES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

export default function StudentRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentId: "",
    department: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshSessionToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await registerStudentAccount({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        studentId: formData.studentId,
        department: formData.department,
        phone: formData.phone || undefined,
      });

      await refreshSessionToken();
      router.push("/student");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      await signInWithGooglePortal(ROLES.STUDENT);
      await refreshSessionToken();
      router.push("/student");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 cyber-panel p-8 rounded-lg border border-brand-border relative">
        <div className="corner-bracket-tl"></div>
        <div className="corner-bracket-tr"></div>
        <div className="corner-bracket-bl"></div>
        <div className="corner-bracket-br"></div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full border border-brand-red/50 overflow-hidden bg-brand-black p-0.5 shadow-red-glow-sm">
            <Image
              src="/assets/brand/shield-emblem.png"
              alt="Shadow Byte Syndicate Emblem"
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          </div>

          <div className="inline-block px-2.5 py-0.5 bg-brand-surface border border-brand-border rounded text-[11px] font-mono text-brand-redBright font-semibold">
            NEW STUDENT REGISTRATION
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            Join Shadow Byte Syndicate
          </h2>
          <p className="text-xs text-brand-gray-muted">
            Create your collegiate student profile to register for workshops and CTF competitions.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono text-brand-redBright flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-brand-gray-dim mb-1">Full Legal / Academic Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={busy}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-brand-gray-dim mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                disabled={busy}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your academic or personal email"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-brand-gray-dim mb-1">Student / Roll ID *</label>
              <div className="relative">
                <Hash className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Enter your student / roll ID"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Department / Branch *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Enter your department or branch"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-brand-gray-dim mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                disabled={busy}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Optional phone number"
                className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-brand-gray-dim mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  disabled={busy}
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 chars"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  disabled={busy}
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full pl-9 pr-3 py-2 bg-brand-black border border-brand-border rounded text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-brand-surface/40 rounded border border-brand-border text-[11px] text-brand-gray-muted">
            By registering, you affirm that you will adhere to Shadow Byte Syndicate&apos;s Ethical Hacking and Responsible Disclosure Charter.
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>CREATE STUDENT ACCOUNT</span>
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-brand-border/70"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono text-brand-gray-dim uppercase">
            OR INSTANT ONBOARDING
          </span>
          <div className="flex-grow border-t border-brand-border/70"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={busy}
          className="w-full py-2.5 bg-brand-surface hover:bg-brand-card border border-brand-border hover:border-brand-red/60 text-white text-xs font-mono font-semibold rounded flex items-center justify-center space-x-2.5 transition-all disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
          ) : (
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
          )}
          <span>SIGN UP WITH GOOGLE</span>
        </button>

        <div className="text-center pt-2 text-xs font-mono text-brand-gray-dim">
          Already registered?{" "}
          <Link href="/login/student" className="text-white hover:text-brand-redBright font-semibold underline">
            Log in to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
