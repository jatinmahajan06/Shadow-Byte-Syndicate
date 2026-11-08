import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import AdminDashboardClient from "@/components/dashboard/AdminDashboardClient";

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
    coordinators,
    students,
    registrations,
    messages,
    auditLogs,
  ] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.teamMember.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: ROLES.COORDINATOR },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: ROLES.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        studentId: true,
        department: true,
        phone: true,
        createdAt: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventRegistration.findMany({
      include: {
        event: { select: { id: true, title: true, slug: true, startDate: true } },
        student: { select: { id: true, name: true, email: true, studentId: true, department: true } },
      },
      orderBy: { registeredAt: "desc" },
      take: 50,
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    }),
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
