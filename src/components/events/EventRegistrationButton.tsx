"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { ROLES } from "@/lib/constants";

interface Props {
  eventId: string;
  isLoggedIn: boolean;
  userRole?: string;
  isRegistered: boolean;
  registrationStatus?: string;
  isFull: boolean;
  deadlinePassed: boolean;
  isOpen: boolean;
}

export default function EventRegistrationButton({
  eventId,
  isLoggedIn,
  userRole,
  isRegistered,
  registrationStatus,
  isFull,
  deadlinePassed,
  isOpen,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(isRegistered);
  const [notes, setNotes] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register.");
      }

      setRegistered(true);
      setShowNotesModal(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration error occurred");
    } finally {
      setLoading(false);
    }
  };

  // State 1: Already Registered
  if (registered) {
    return (
      <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-lg space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>YOU ARE REGISTERED FOR THIS EVENT</span>
        </div>
        <p className="text-xs text-brand-gray-text font-sans">
          Your seat is confirmed. You can review your admission details or cancel at any time in your Student Dashboard.
        </p>
        <div className="pt-2">
          <Link
            href="/student"
            className="inline-block px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded text-xs font-mono font-semibold transition-colors"
          >
            VIEW IN STUDENT DASHBOARD &gt;
          </Link>
        </div>
      </div>
    );
  }

  // State 2: Not logged in
  if (!isLoggedIn) {
    return (
      <div className="p-5 cyber-panel rounded-lg border border-brand-border space-y-3">
        <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-brand-red" />
          <span>Student Authentication Required</span>
        </h4>
        <p className="text-xs text-brand-gray-muted leading-relaxed font-sans">
          To register for Shadow Byte Syndicate events, sign in with your active student credentials.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={`/login/student?redirect=/events/${eventId}`}
            className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow-sm transition-all"
          >
            LOG IN TO REGISTER
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-brand-surface hover:bg-brand-card border border-brand-border text-white text-xs font-mono font-medium rounded transition-all"
          >
            NEW STUDENT SIGNUP
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Non-student role (Coordinators and Admins cannot register as participants)
  if (userRole !== ROLES.STUDENT) {
    return (
      <div className="p-4 bg-brand-card border border-brand-border rounded-lg text-xs font-mono text-brand-gray-dim">
        Logged in as <span className="text-white font-bold">{userRole}</span>. Event participation is reserved for student accounts. Administrative accounts manage event operations via their respective dashboards.
      </div>
    );
  }

  // State 4: Registration Closed or Full
  if (!isOpen) {
    return (
      <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-lg text-xs font-mono text-brand-redBright flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Registration for this event has been closed by administration.</span>
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="p-4 bg-amber-950/30 border border-amber-900/60 rounded-lg text-xs font-mono text-amber-400 flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Registration deadline for this event has passed.</span>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg text-xs font-mono text-brand-red flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Event is at maximum capacity (Sold Out).</span>
      </div>
    );
  }

  // State 5: Open for Student Registration
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono text-brand-redBright flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showNotesModal ? (
        <div className="p-5 cyber-panel rounded-lg border border-brand-red/50 space-y-3">
          <h4 className="text-sm font-bold text-white font-mono">Confirm Event Registration</h4>
          <div>
            <label className="block text-xs font-mono text-brand-gray-dim mb-1">
              Optional Technical Background or Laptop Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bringing Kali Linux VM; interested in binary exploitation..."
              className="w-full h-20 p-2.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="px-5 py-2 bg-brand-red hover:bg-brand-redBright disabled:opacity-50 text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center space-x-2 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>CONFIRM REGISTRATION</span>
            </button>
            <button
              onClick={() => setShowNotesModal(false)}
              className="px-4 py-2 bg-brand-surface text-brand-gray-dim hover:text-white text-xs font-mono rounded"
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNotesModal(true)}
          className="w-full sm:w-auto px-8 py-3.5 bg-brand-red hover:bg-brand-redBright text-white text-sm font-mono font-bold rounded border border-brand-redBright/50 shadow-red-glow transition-all flex items-center justify-center space-x-2"
        >
          <UserCheck className="w-4 h-4" />
          <span>REGISTER NOW (STUDENT FREE ACCESS)</span>
        </button>
      )}
    </div>
  );
}
