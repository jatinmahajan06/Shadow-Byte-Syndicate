"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { REGISTRATION_STATUS } from "@/lib/constants";

interface Registration {
  id: string;
  status: string;
  registeredAt: string;
  notes: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    startDate: string;
    endDate: string;
    venue: string;
    mode: string;
    category: string;
  };
}

interface EventItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startDate: string;
  venue: string;
  mode: string;
  category: string;
}

interface Props {
  initialRegistrations: Registration[];
  upcomingAvailableEvents: EventItem[];
}

export default function StudentDashboardClient({
  initialRegistrations,
  upcomingAvailableEvents,
}: Props) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm("Are you sure you want to cancel your registration for this event?")) {
      return;
    }

    setCancellingId(registrationId);
    setError(null);

    try {
      const res = await fetch("/api/events/cancel-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel registration.");
      }

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId ? { ...r, status: REGISTRATION_STATUS.CANCELLED } : r
        )
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error cancelling registration");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono text-brand-redBright flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. My Registrations */}
      <div className="space-y-4">
        <div className="border-l-2 border-brand-red pl-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              ADMISSION STATUS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">My Event Registrations</h2>
          </div>
          <span className="text-xs font-mono text-brand-gray-dim">
            Total Records: {registrations.length}
          </span>
        </div>

        {registrations.length === 0 ? (
          <div className="p-12 text-center cyber-panel rounded-lg border border-brand-border space-y-3">
            <Calendar className="w-10 h-10 text-brand-gray-dim mx-auto" />
            <h3 className="text-base font-bold text-white">No Active Registrations</h3>
            <p className="text-xs text-brand-gray-muted max-w-sm mx-auto">
              You haven&apos;t registered for any workshops or CTFs yet. Browse upcoming events to reserve your seat!
            </p>
            <div className="pt-2">
              <Link
                href="/events"
                className="inline-block px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow-sm"
              >
                Browse Available Events &gt;
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrations.map((reg) => {
              const isConfirmed = reg.status === REGISTRATION_STATUS.CONFIRMED;
              const isPast = new Date() > new Date(reg.event.startDate);

              return (
                <div
                  key={reg.id}
                  className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-redBright">
                        {reg.event.category}
                      </span>

                      {isConfirmed ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CONFIRMED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-brand-gray-dim font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{reg.status}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white line-clamp-1 mb-2">
                      <Link
                        href={`/events/${reg.event.slug}`}
                        className="hover:text-brand-redBright transition-colors"
                      >
                        {reg.event.title}
                      </Link>
                    </h3>

                    <div className="space-y-1.5 text-xs font-mono text-brand-gray-text">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                        <span>{new Date(reg.event.startDate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                        <span className="truncate">{reg.event.venue} ({reg.event.mode})</span>
                      </div>
                    </div>

                    {reg.notes && (
                      <div className="mt-3 p-2 bg-brand-black rounded text-[11px] font-mono text-brand-gray-dim">
                        Note: {reg.notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-gray-dim">
                      Registered: {new Date(reg.registeredAt).toLocaleDateString()}
                    </span>

                    {isConfirmed && !isPast && (
                      <button
                        onClick={() => handleCancelRegistration(reg.id)}
                        disabled={cancellingId === reg.id}
                        className="px-3 py-1 bg-brand-surface hover:bg-red-950/60 border border-brand-border hover:border-brand-red rounded text-[11px] font-mono text-brand-red transition-all flex items-center space-x-1"
                      >
                        {cancellingId === reg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        <span>Cancel Seat</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Open Events Recommendation */}
      {upcomingAvailableEvents.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-brand-border/60">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              OPPORTUNITIES
            </span>
            <h2 className="text-xl font-bold text-white">Other Available Workshops & CTFs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingAvailableEvents.map((evt) => (
              <div
                key={evt.id}
                className="cyber-panel p-4 rounded-lg border border-brand-border flex flex-col justify-between hover:border-brand-red/60 transition-all"
              >
                <div>
                  <span className="text-[10px] font-mono text-brand-redBright block mb-1">
                    {evt.category}
                  </span>
                  <h4 className="text-sm font-bold text-white line-clamp-2 mb-2">{evt.title}</h4>
                  <p className="text-[11px] text-brand-gray-dim line-clamp-2 mb-3">{evt.summary}</p>
                </div>
                <Link
                  href={`/events/${evt.slug}`}
                  className="w-full py-1.5 bg-brand-surface hover:bg-brand-red text-center rounded text-xs font-mono font-semibold text-white block transition-all"
                >
                  View Details &gt;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
