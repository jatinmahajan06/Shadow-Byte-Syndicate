import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, REGISTRATION_STATUS } from "@/lib/constants";
import { getStudentRegistrations, getPublishedEvents } from "@/services/eventService";
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Dashboard",
  description: "Manage your event registrations and student member status in Shadow Byte Syndicate.",
};

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  // Strict server-side authorization: Reject unauthenticated or non-student users
  if (!user) {
    redirect("/login/student");
  }

  if (user.role !== ROLES.STUDENT) {
    if (user.role === ROLES.SUPER_ADMIN) redirect("/admin");
    if (user.role === ROLES.COORDINATOR) redirect("/coordinator");
    redirect("/");
  }

  const [registrations, allUpcoming] = await Promise.all([
    getStudentRegistrations(user.uid),
    getPublishedEvents({ filter: "upcoming" }),
  ]);

  const registeredEventIds = new Set(
    registrations
      .filter((r: any) => r.status === REGISTRATION_STATUS.CONFIRMED)
      .map((r: any) => r.eventId)
  );

  const upcomingEvents = allUpcoming
    .filter((evt) => !registeredEventIds.has(evt.id))
    .slice(0, 4);

  return (
    <div className="py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Banner */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-border relative">
          <div className="corner-bracket-tl"></div>
          <div className="corner-bracket-tr"></div>
          <div className="corner-bracket-bl"></div>
          <div className="corner-bracket-br"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-brand-surface border border-brand-border rounded text-[11px] font-mono text-brand-red font-semibold mb-2">
                COLLEGIATE STUDENT MEMBER
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-brand-gray-dim mt-2">
                <span>Email: <strong className="text-white">{user.email}</strong></span>
                <span>Roll ID: <strong className="text-white">{user.studentId || "N/A"}</strong></span>
                <span>Dept: <strong className="text-white">{user.department || "N/A"}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/events"
                className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow transition-all"
              >
                BROWSE NEW EVENTS
              </Link>
            </div>
          </div>
        </div>

        {/* Client Interactive Section (with Cancel Registration and filter support) */}
        <StudentDashboardClient
          initialRegistrations={registrations as any}
          upcomingAvailableEvents={upcomingEvents as any}
        />
      </div>
    </div>
  );
}

