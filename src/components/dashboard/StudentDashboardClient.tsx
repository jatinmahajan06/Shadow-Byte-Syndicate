"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Activity,
  Upload,
} from "lucide-react";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import {
  subscribeCollection,
  updateOwnUserProfile,
  where,
  orderBy,
  limit,
} from "@/firebase/firestore";
import { isFirebaseConfigured } from "@/firebase/config";

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

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  createdAt: string;
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
  const { profile, firebaseUser } = useAuth();
  const { uploadFile, uploading, progress } = useStorageUpload();
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    studentId: "",
    department: "",
    phone: "",
    notifications: true,
    photoURL: "",
  });

  const router = useRouter();

  // Sync profile form when AuthContext loads real-time user profile
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        studentId: profile.studentId || "",
        department: profile.department || "",
        phone: profile.phone || "",
        notifications: profile.preferences?.notifications !== false,
        photoURL: profile.photoURL || "",
      });
    }
  }, [profile]);

  // Real-time Firestore subscriptions for registrations and user activity history
  useEffect(() => {
    if (!firebaseUser?.uid || !isFirebaseConfigured()) return;

    const unsubRegs = subscribeCollection<Record<string, any>>(
      ["eventRegistrations"],
      [where("studentId", "==", firebaseUser.uid), orderBy("registeredAt", "desc")],
      (docs) => {
        const mapped: Registration[] = docs.map((d) => ({
          id: d.id,
          status: d.status || REGISTRATION_STATUS.CONFIRMED,
          registeredAt: d.registeredAt || new Date().toISOString(),
          notes: d.notes || null,
          event: {
            id: d.eventId,
            slug: d.eventSlug,
            title: d.eventTitle,
            summary: d.eventSummary || "",
            startDate: d.eventStartDate,
            endDate: d.eventEndDate,
            venue: d.eventVenue,
            mode: d.eventMode,
            category: d.eventCategory,
          },
        }));
        setRegistrations(mapped);
      }
    );

    const unsubActivity = subscribeCollection<ActivityEntry>(
      ["users", firebaseUser.uid, "activityHistory"],
      [orderBy("createdAt", "desc"), limit(8)],
      (docs) => {
        setActivityLogs(docs);
      }
    );

    return () => {
      unsubRegs();
      unsubActivity();
    };
  }, [firebaseUser?.uid]);

  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm("Are you sure you want to cancel your registration for this event?")) {
      return;
    }

    setCancellingId(registrationId);
    setError(null);
    setSuccessMsg(null);

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
      setSuccessMsg("Registration cancelled.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error cancelling registration");
    } finally {
      setCancellingId(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser?.uid) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const uploaded = await uploadFile(file, "avatars");
      await updateOwnUserProfile(firebaseUser.uid, { photoURL: uploaded.url });
      setProfileForm((prev) => ({ ...prev, photoURL: uploaded.url }));
      setSuccessMsg("Avatar uploaded to Firebase Storage & linked to your profile.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.uid) return;

    setSavingProfile(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateOwnUserProfile(firebaseUser.uid, {
        name: profileForm.name.trim(),
        studentId: profileForm.studentId.trim(),
        department: profileForm.department.trim(),
        phone: profileForm.phone.trim(),
        preferences: {
          notifications: profileForm.notifications,
          theme: "dark",
        },
      });
      setSuccessMsg("Profile & notification preferences saved to Cloud Firestore.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
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

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-xs font-mono text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. My Registrations */}
      <div className="space-y-4">
        <div className="border-l-2 border-brand-red pl-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              ADMISSION STATUS // LIVE SYNC
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
                      Registered: {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : "Just now"}
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

      {/* 2. Profile Management & Recent Activity Grid */}
      {firebaseUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-brand-border/60">
          {/* Student Profile & Firebase Storage Avatar */}
          <form onSubmit={handleSaveProfile} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <div className="border-l-2 border-brand-red pl-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
                  IDENTITY SETTINGS
                </span>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <User className="w-4 h-4 text-brand-red" />
                  <span>Profile & Preferences</span>
                </h2>
              </div>
              {profileForm.photoURL && (
                <div className="w-11 h-11 rounded-full overflow-hidden border border-brand-red/50 bg-brand-black">
                  <Image
                    src={profileForm.photoURL}
                    alt="Profile avatar"
                    width={44}
                    height={44}
                    unoptimized
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-brand-gray-dim mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                />
              </div>
              <div>
                <label className="block text-brand-gray-dim mb-1">Student / Roll ID</label>
                <input
                  type="text"
                  value={profileForm.studentId}
                  onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
                  placeholder="Enter student / roll ID"
                  className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                />
              </div>
              <div>
                <label className="block text-brand-gray-dim mb-1">Department</label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  placeholder="Enter department"
                  className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                />
              </div>
              <div>
                <label className="block text-brand-gray-dim mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Optional phone number"
                  className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="block text-brand-gray-dim">Upload Profile Avatar (JPEG/PNG/WebP max 5MB)</label>
              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-card border border-brand-border rounded cursor-pointer text-white">
                  <Upload className="w-3.5 h-3.5 text-brand-red" />
                  <span>{uploading ? `Uploading ${progress}%` : "Choose Image"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                {uploading && (
                  <div className="flex-1 bg-brand-black rounded-full h-2 border border-brand-border overflow-hidden">
                    <div
                      className="bg-brand-red h-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs font-mono text-brand-gray-text cursor-pointer">
              <input
                type="checkbox"
                checked={profileForm.notifications}
                onChange={(e) => setProfileForm({ ...profileForm, notifications: e.target.checked })}
                className="accent-brand-red"
              />
              <span>Receive upcoming CTF & workshop schedule notifications</span>
            </label>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>SAVE PROFILE SETTINGS</span>
            </button>
          </form>

          {/* Activity History */}
          <div className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <div className="border-l-2 border-brand-red pl-3">
              <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
                USER ISOLATED TELEMETRY
              </span>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-brand-red" />
                <span>Recent Account Activity</span>
              </h2>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-xs font-mono text-brand-gray-dim py-6">
                No recent account events recorded yet. Actions such as event registrations and logins appear here in real time.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-brand-black/80 border border-brand-border/70 rounded text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-brand-redBright font-bold text-[11px]">{log.action}</span>
                      <span className="text-[10px] text-brand-gray-dim">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Now"}
                      </span>
                    </div>
                    <p className="text-brand-gray-text text-[11px] font-sans">{log.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Open Events Recommendation */}
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
