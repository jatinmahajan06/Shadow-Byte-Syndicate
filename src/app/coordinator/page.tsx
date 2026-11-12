import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getAllEvents } from "@/services/eventService";
import { getAllPosts } from "@/services/postService";
import CoordinatorDashboardClient from "@/components/dashboard/CoordinatorDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coordinator Operations Hub",
  description: "Create, edit, publish, and manage events and technical articles for Shadow Byte Syndicate.",
};

export default async function CoordinatorPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/coordinator");
  }

  // STRICT ACCESS CONTROL: Only COORDINATOR and SUPER_ADMIN can access
  if (user.role !== ROLES.COORDINATOR && user.role !== ROLES.SUPER_ADMIN) {
    redirect("/login/coordinator");
  }

  const [events, posts] = await Promise.all([
    getAllEvents(),
    getAllPosts(),
  ]);

  return (
    <div className="py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Banner */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-red/40 relative">
          <div className="corner-bracket-tl"></div>
          <div className="corner-bracket-tr"></div>
          <div className="corner-bracket-bl"></div>
          <div className="corner-bracket-br"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-brand-surface border border-brand-red/60 rounded text-[11px] font-mono text-brand-redBright font-semibold mb-2">
                COORDINATOR MANAGEMENT PORTAL
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user.name}
              </h1>
              <p className="text-xs text-brand-gray-muted mt-1 font-mono">
                Role: <strong className="text-white">{user.role}</strong> | Authorized for: Event Management & Knowledge Hub Publishing
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="px-3 py-1.5 bg-brand-card border border-brand-border rounded text-brand-gray-text">
                Total Events: <strong className="text-white">{events.length}</strong>
              </span>
              <span className="px-3 py-1.5 bg-brand-card border border-brand-border rounded text-brand-gray-text">
                Total Posts: <strong className="text-white">{posts.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Client Interactive Workspace */}
        <CoordinatorDashboardClient
          initialEvents={events as any}
          initialPosts={posts as any}
          currentUserRole={user.role}
        />
      </div>
    </div>
  );
}

