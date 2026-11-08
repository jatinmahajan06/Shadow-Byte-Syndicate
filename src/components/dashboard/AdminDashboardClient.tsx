"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Settings,
  Calendar,
  BookOpen,
  Users,
  UserCheck,
  FileText,
  Mail,
  Activity,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bookmark,
  Terminal,
} from "lucide-react";
import { ROLES, PUBLISH_STATUS, EVENT_MODES } from "@/lib/constants";

interface Props {
  initialSettings: any;
  initialEvents: any[];
  initialPosts: any[];
  initialTeam: any[];
  initialResources: any[];
  initialCoordinators: any[];
  initialStudents: any[];
  initialRegistrations: any[];
  initialMessages: any[];
  initialAuditLogs: any[];
}

export default function AdminDashboardClient({
  initialSettings,
  initialEvents,
  initialPosts,
  initialTeam,
  initialResources,
  initialCoordinators,
  initialStudents,
  initialRegistrations,
  initialMessages,
  initialAuditLogs,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "settings"
    | "events"
    | "posts"
    | "registrations"
    | "coordinators"
    | "students"
    | "team"
    | "resources"
    | "messages"
    | "audit"
  >("overview");

  // State collections
  const [settings, setSettings] = useState(initialSettings || {});
  const [events, setEvents] = useState(initialEvents);
  const [posts, setPosts] = useState(initialPosts);
  const [team, setTeam] = useState(initialTeam);
  const [resources, setResources] = useState(initialResources);
  const [coordinators, setCoordinators] = useState(initialCoordinators);
  const [students, setStudents] = useState(initialStudents);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [messages, setMessages] = useState(initialMessages);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);

  // Forms / Modals
  const [newCoord, setNewCoord] = useState({ name: "", email: "", password: "", department: "", phone: "" });
  const [newMember, setNewMember] = useState({ name: "", role: "", category: "CORE_TEAM", bio: "", email: "", githubUrl: "", linkedinUrl: "" });
  const [newResource, setNewResource] = useState({ title: "", description: "", category: "Web Security", url: "", difficulty: "Beginner" });

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  // 1. Save Site Settings & Branding
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save site settings.");

      setStatusMsg({ type: "success", text: "Site settings and brand configuration updated!" });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error saving settings" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Create Coordinator
  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/coordinators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoord),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create coordinator.");

      setCoordinators([data.coordinator, ...coordinators]);
      setNewCoord({ name: "", email: "", password: "", department: "", phone: "" });
      setStatusMsg({ type: "success", text: `Coordinator account created for ${data.coordinator.email}` });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error creating coordinator" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Toggle User Active Status (Coordinator or Student)
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean, isCoord: boolean) => {
    setLoading(true);
    setStatusMsg(null);

    try {
      const endpoint = isCoord ? "/api/admin/coordinators" : "/api/admin/students";
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, isActive: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account status.");

      if (isCoord) {
        setCoordinators(coordinators.map((c) => (c.id === userId ? { ...c, isActive: !currentStatus } : c)));
      } else {
        setStudents(students.map((s) => (s.id === userId ? { ...s, isActive: !currentStatus } : s)));
      }

      setStatusMsg({ type: "success", text: "Account status successfully updated." });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error updating account" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete Event Permanently (Super Admin Only)
  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete event "${title}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events?id=${eventId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event.");

      setEvents(events.filter((e) => e.id !== eventId));
      setStatusMsg({ type: "success", text: `Event "${title}" permanently deleted.` });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Delete error" });
    } finally {
      setLoading(false);
    }
  };

  // 5. Delete Post Permanently (Super Admin Only)
  const handleDeletePost = async (postId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete article "${title}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts?id=${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete post.");

      setPosts(posts.filter((p) => p.id !== postId));
      setStatusMsg({ type: "success", text: `Post "${title}" permanently deleted.` });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Delete error" });
    } finally {
      setLoading(false);
    }
  };

  // 6. Add Team Member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add team member");

      setTeam([...team, data.member]);
      setNewMember({ name: "", role: "", category: "CORE_TEAM", bio: "", email: "", githubUrl: "", linkedinUrl: "" });
      setStatusMsg({ type: "success", text: "Team member added!" });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
      setTeam(team.filter((m) => m.id !== id));
      setStatusMsg({ type: "success", text: "Team member removed." });
    } catch (e) {}
  };

  // 7. Add Resource
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newResource),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add resource");

      setResources([data.resource, ...resources]);
      setNewResource({ title: "", description: "", category: "Web Security", url: "", difficulty: "Beginner" });
      setStatusMsg({ type: "success", text: "Learning resource published!" });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await fetch(`/api/admin/resources?id=${id}`, { method: "DELETE" });
      setResources(resources.filter((r) => r.id !== id));
      setStatusMsg({ type: "success", text: "Resource deleted." });
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded border text-xs font-mono flex items-center space-x-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
              : "bg-red-950/50 border-red-800 text-brand-redBright"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Admin Navigation Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-brand-border/80 text-xs font-mono">
        {[
          { key: "overview", label: "Overview", icon: Activity },
          { key: "settings", label: "Branding & Content", icon: Settings },
          { key: "events", label: `Events (${events.length})`, icon: Calendar },
          { key: "posts", label: `Posts (${posts.length})`, icon: BookOpen },
          { key: "registrations", label: `Registrations (${registrations.length})`, icon: FileText },
          { key: "coordinators", label: `Coordinators (${coordinators.length})`, icon: Shield },
          { key: "students", label: `Students (${students.length})`, icon: UserCheck },
          { key: "team", label: `Team (${team.length})`, icon: Users },
          { key: "resources", label: `Resources (${resources.length})`, icon: Bookmark },
          { key: "messages", label: `Messages (${messages.length})`, icon: Mail },
          { key: "audit", label: `Audit Logs (${auditLogs.length})`, icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded whitespace-nowrap flex items-center space-x-1.5 font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-brand-red text-white shadow-red-glow-sm"
                  : "bg-brand-surface text-brand-gray-dim hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================= */}
      {/* OVERVIEW TAB */}
      {/* ======================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Active Students", value: students.length, color: "text-emerald-400" },
              { label: "Coordinators", value: coordinators.length, color: "text-brand-redBright" },
              { label: "Total Events", value: events.length, color: "text-white" },
              { label: "Registrations", value: registrations.length, color: "text-white" },
              { label: "Knowledge Posts", value: posts.length, color: "text-white" },
              { label: "Inquiries", value: messages.length, color: "text-amber-400" },
            ].map((stat, i) => (
              <div key={i} className="cyber-panel p-4 rounded-lg border border-brand-border text-center">
                <span className="text-[10px] font-mono text-brand-gray-dim uppercase block mb-1">
                  {stat.label}
                </span>
                <span className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="cyber-panel p-6 rounded-lg border border-brand-border space-y-3">
            <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
              Super Admin Quick Guide
            </h3>
            <p className="text-xs text-brand-gray-text leading-relaxed font-sans">
              As a Super Administrator, you possess root privileges over the entire Shadow Byte Syndicate platform. You can configure website typography and slogans, update branding images, manage coordinator appointments, audit all logins, inspect registrations, and permanently delete content.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* SETTINGS & BRANDING TAB */}
      {/* ======================================================= */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              CONTENT MANAGEMENT
            </span>
            <h2 className="text-xl font-bold text-white">Website Content, Slogans & Branding</h2>
            <p className="text-xs text-brand-gray-muted mt-1 font-sans">
              Modify text, mottos, and contact information without editing source code. Changes take effect across public pages immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-brand-gray-dim mb-1">Club Name</label>
              <input
                type="text"
                value={settings.clubName || ""}
                onChange={(e) => setSettings({ ...settings, clubName: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Supporting Line</label>
              <input
                type="text"
                value={settings.supportingLine || ""}
                onChange={(e) => setSettings({ ...settings, supportingLine: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Main Tagline</label>
              <input
                type="text"
                value={settings.mainTagline || ""}
                onChange={(e) => setSettings({ ...settings, mainTagline: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Secondary Phrase</label>
              <input
                type="text"
                value={settings.secondaryPhrase || ""}
                onChange={(e) => setSettings({ ...settings, secondaryPhrase: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Administrative Contact Email</label>
              <input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Official Club Timezone</label>
              <input
                type="text"
                value={settings.timezone || "Asia/Kolkata"}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-brand-gray-dim mb-1">Homepage Mission / Summary Text</label>
              <textarea
                rows={3}
                value={settings.aboutSummary || ""}
                onChange={(e) => setSettings({ ...settings, aboutSummary: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">Ethical Cybersecurity Charter Text</label>
              <textarea
                rows={4}
                value={settings.ethicsStatement || ""}
                onChange={(e) => setSettings({ ...settings, ethicsStatement: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-brand-border/60">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>SAVE CONFIGURATION CHANGES</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================= */}
      {/* EVENTS TAB (WITH PERMANENT DELETION) */}
      {/* ======================================================= */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-brand-surface/40">
                    <td className="p-3 font-bold text-white max-w-xs truncate">{evt.title}</td>
                    <td className="p-3 text-brand-gray-dim">
                      {new Date(evt.startDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-white">
                      {evt._count?.registrations || 0} / {evt.capacity}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-brand-surface text-brand-redBright font-bold">
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.title)}
                        className="px-2.5 py-1 bg-red-950/60 hover:bg-brand-red border border-red-800 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* POSTS TAB (WITH PERMANENT DELETION) */}
      {/* ======================================================= */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-brand-surface/40">
                    <td className="p-3 font-bold text-white max-w-xs truncate">{post.title}</td>
                    <td className="p-3 text-brand-gray-text">{post.category}</td>
                    <td className="p-3 text-brand-gray-dim">{post.createdBy?.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-brand-surface text-brand-redBright font-bold">
                        {post.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleDeletePost(post.id, post.title)}
                        className="px-2.5 py-1 bg-red-950/60 hover:bg-brand-red border border-red-800 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* REGISTRATIONS REVIEW TAB */}
      {/* ======================================================= */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Event</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Email & Roll ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-brand-gray-dim">
                      No registrations found.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-brand-surface/40">
                      <td className="p-3 font-bold text-white max-w-xs truncate">
                        {reg.event?.title}
                      </td>
                      <td className="p-3 text-brand-gray-text">{reg.student?.name}</td>
                      <td className="p-3 text-brand-gray-dim">
                        {reg.student?.email} ({reg.student?.studentId || "N/A"})
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reg.status === "CONFIRMED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-brand-red border border-red-800"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="p-3 text-brand-gray-dim">
                        {new Date(reg.registeredAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* COORDINATOR ACCOUNTS TAB */}
      {/* ======================================================= */}
      {activeTab === "coordinators" && (
        <div className="space-y-6">
          {/* Create Coordinator Form */}
          <form onSubmit={handleCreateCoordinator} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
              Appoint New Coordinator Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={newCoord.name}
                onChange={(e) => setNewCoord({ ...newCoord, name: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="email"
                required
                placeholder="Coordinator Email *"
                value={newCoord.email}
                onChange={(e) => setNewCoord({ ...newCoord, email: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Initial Password (Min 8 chars) *"
                value={newCoord.password}
                onChange={(e) => setNewCoord({ ...newCoord, password: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow"
            >
              CREATE COORDINATOR ACCOUNT
            </button>
          </form>

          {/* Coordinators List */}
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {coordinators.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-surface/40">
                    <td className="p-3 font-bold text-white">{c.name}</td>
                    <td className="p-3 text-brand-gray-dim">{c.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-brand-red border border-red-800"
                        }`}
                      >
                        {c.isActive ? "ACTIVE" : "DEACTIVATED"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(c.id, c.isActive, true)}
                        className="px-2.5 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                      >
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* STUDENT ACCOUNTS TAB */}
      {/* ======================================================= */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Roll ID</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-surface/40">
                    <td className="p-3 font-bold text-white">{s.name}</td>
                    <td className="p-3 text-brand-gray-dim">{s.email}</td>
                    <td className="p-3 text-brand-gray-text">{s.studentId || "N/A"}</td>
                    <td className="p-3 text-brand-gray-dim">{s.department || "N/A"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-brand-red border border-red-800"
                        }`}
                      >
                        {s.isActive ? "ACTIVE" : "DEACTIVATED"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(s.id, s.isActive, false)}
                        className="px-2.5 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TEAM MEMBERS TAB */}
      {/* ======================================================= */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <form onSubmit={handleAddTeamMember} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
              Add Faculty or Core Team Member
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <input
                type="text"
                required
                placeholder="Name *"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="text"
                required
                placeholder="Role / Job Title *"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <select
                value={newMember.category}
                onChange={(e) => setNewMember({ ...newMember, category: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              >
                <option value="FACULTY">Faculty Coordinator</option>
                <option value="CORE_TEAM">Core Committee</option>
                <option value="LEAD">Technical Lead</option>
                <option value="ADVISOR">Advisor</option>
              </select>
            </div>
            <div>
              <textarea
                required
                rows={2}
                placeholder="Short Academic / Research Biography *"
                value={newMember.bio}
                onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow"
            >
              ADD TEAM MEMBER
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((m) => (
              <div key={m.id} className="cyber-panel p-4 rounded border border-brand-border flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-white">{m.name}</h4>
                  <div className="text-[11px] font-mono text-brand-red font-semibold">{m.role} ({m.category})</div>
                  <p className="text-xs text-brand-gray-dim line-clamp-2 mt-1">{m.bio}</p>
                </div>
                <button
                  onClick={() => handleDeleteTeamMember(m.id)}
                  className="p-1.5 text-brand-gray-dim hover:text-brand-red"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* RESOURCES TAB */}
      {/* ======================================================= */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <form onSubmit={handleAddResource} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
              Publish Cybersecurity Learning Resource
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <input
                type="text"
                required
                placeholder="Resource Title *"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="url"
                required
                placeholder="URL Link *"
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <select
                value={newResource.difficulty}
                onChange={(e) => setNewResource({ ...newResource, difficulty: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <textarea
                required
                rows={2}
                placeholder="Brief description of the practice lab or tutorial..."
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow"
            >
              PUBLISH RESOURCE
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => (
              <div key={r.id} className="cyber-panel p-4 rounded border border-brand-border flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-white">{r.title}</h4>
                  <div className="text-[11px] font-mono text-brand-red font-semibold">{r.category} // {r.difficulty}</div>
                  <p className="text-xs text-brand-gray-dim line-clamp-2 mt-1">{r.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteResource(r.id)}
                  className="p-1.5 text-brand-gray-dim hover:text-brand-red"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MESSAGES TAB */}
      {/* ======================================================= */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Sender</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-brand-gray-dim">
                      No contact submissions received yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-brand-surface/40">
                      <td className="p-3 font-bold text-white">
                        {m.name} <span className="block text-[10px] text-brand-gray-dim font-normal">{m.email}</span>
                      </td>
                      <td className="p-3 text-brand-redBright font-medium">{m.subject}</td>
                      <td className="p-3 text-brand-gray-text max-w-sm truncate">{m.message}</td>
                      <td className="p-3 text-brand-gray-dim">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* AUDIT LOGS TAB */}
      {/* ======================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-brand-surface/40">
                    <td className="p-3 font-bold text-brand-redBright">{log.action}</td>
                    <td className="p-3 text-white">{log.entityType}</td>
                    <td className="p-3 text-brand-gray-dim">{log.user?.email || "System/Public"}</td>
                    <td className="p-3 text-brand-gray-text max-w-xs truncate">{log.details || "-"}</td>
                    <td className="p-3 text-brand-gray-dim">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
