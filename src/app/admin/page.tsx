import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  getSiteSettings,
  getTeamMembers,
  getResources,
  getGalleryItems,
  getContactMessages,
  getAuditLogs,
} from "@/services/siteService";
import { getAllEvents, getAllRegistrations } from "@/services/eventService";
import { getAllPosts } from "@/services/postService";
import { listUsersByRole } from "@/services/userService";
import AdminDashboardClient from "@/components/dashboard/AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin Command Console",
  description: "Comprehensive administration, content editor, account governance, and audit logs for Shadow Byte Syndicate.",
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/super-admin");
  }

  // STRICT AUTHORIZATION CHECK: Only SUPER_ADMIN can enter /admin
  if (user.role !== ROLES.SUPER_ADMIN) {
    if (user.role === ROLES.COORDINATOR) redirect("/coordinator");
    if (user.role === ROLES.STUDENT) redirect("/student");
    redirect("/");
  }

  const [
    settings,
    events,
    posts,
    teamMembers,
    resources,
    galleryItems,
    coordinators,
    students,
    registrations,
    messages,
    auditLogs,
  ] = await Promise.all([
    getSiteSettings(),
    getAllEvents(),
    getAllPosts(),
    getTeamMembers(),
    getResources(),
    getGalleryItems(),
    listUsersByRole(ROLES.COORDINATOR),
    listUsersByRole(ROLES.STUDENT),
    getAllRegistrations(50),
    getContactMessages(),
    getAuditLogs(),
  ]);

  return (
    <div className="py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Admin Header */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-red relative">
          <div className="corner-bracket-tl"></div>
          <div className="corner-bracket-tr"></div>
          <div className="corner-bracket-bl"></div>
          <div className="corner-bracket-br"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-brand-surface border border-brand-red rounded text-[11px] font-mono text-brand-redBright font-semibold mb-2">
                SUPER ADMIN COMMAND CONSOLE // ROOT PRIVILEGES
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Systems & Content Administration
              </h1>
              <p className="text-xs text-brand-gray-muted mt-1 font-mono">
                Operator: <strong className="text-white">{user.name}</strong> ({user.email}) | Club:{" "}
                <strong className="text-brand-redBright">{settings?.clubName || "SHADOW BYTE SYNDICATE"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Client Interactive Administration Panel */}
        <AdminDashboardClient
          initialSettings={settings as any}
          initialEvents={events as any}
          initialPosts={posts as any}
          initialTeam={teamMembers as any}
          initialResources={resources as any}
          initialGallery={galleryItems as any}
          initialCoordinators={coordinators as any}
          initialStudents={students as any}
          initialRegistrations={registrations as any}
          initialMessages={messages as any}
          initialAuditLogs={auditLogs as any}
        />
      </div>
    </div>
  );
}

