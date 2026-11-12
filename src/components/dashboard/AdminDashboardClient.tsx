"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bookmark,
  Terminal,
  Image as ImageIcon,
  Archive,
  Eye,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import { ROLES, UserRole } from "@/lib/constants";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/firebase/config";

interface Props {
  initialSettings: any;
  initialEvents: any[];
  initialPosts: any[];
  initialTeam: any[];
  initialResources: any[];
  initialGallery?: any[];
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
  initialGallery = [],
  initialCoordinators,
  initialStudents,
  initialRegistrations,
  initialMessages,
  initialAuditLogs,
}: Props) {
  const { firebaseUser } = useAuth();
  const { uploadFile, uploading: storageUploading, progress } = useStorageUpload();
  const [fallbackUploading, setFallbackUploading] = useState(false);
  const uploading = storageUploading || fallbackUploading;

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
    | "gallery"
    | "messages"
    | "audit"
  >("overview");

  // State collections
  const [settings, setSettings] = useState(initialSettings || {});
  const [events, setEvents] = useState(initialEvents);
  const [posts, setPosts] = useState(initialPosts);
  const [team, setTeam] = useState(initialTeam);
  const [resources, setResources] = useState(initialResources);
  const [gallery, setGallery] = useState(initialGallery);
  const [coordinators, setCoordinators] = useState(initialCoordinators);
  const [students, setStudents] = useState(initialStudents);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [messages, setMessages] = useState(initialMessages);
  const [auditLogs] = useState(initialAuditLogs);

  const RESOURCE_CATEGORIES = [
    "Linux & Wargames",
    "Web Security",
    "Binary Exploitation",
    "Cryptography",
    "Reverse Engineering",
    "Defensive Security",
    "General",
  ];

  // Forms / Modals
  const [newCoord, setNewCoord] = useState({ name: "", email: "", password: "", department: "", phone: "" });
  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    category: "CORE_TEAM",
    bio: "",
    photoUrl: "",
    email: "",
    githubUrl: "",
    linkedinUrl: "",
  });
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    category: "Web Security",
    url: "",
    difficulty: "Beginner",
    isPublished: true,
  });
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [newGallery, setNewGallery] = useState({ title: "", caption: "", imageUrl: "", eventTag: "" });

  // Structured Confirmation Modals (replaces native browser confirm())
  const [deleteEventModal, setDeleteEventModal] = useState<{
    event: any;
    registrationCount: number;
    loadingCount: boolean;
    acknowledgeCascade: boolean;
    confirmPhrase: string;
  } | null>(null);
  const [archiveEventModal, setArchiveEventModal] = useState<any | null>(null);
  const [confirmGenericModal, setConfirmGenericModal] = useState<{
    type: "post" | "resource" | "team" | "gallery";
    id: string;
    title: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const uploadAdminAsset = async (
    file: File,
    folder: "branding" | "team" | "gallery"
  ): Promise<string> => {
    if (firebaseUser && isFirebaseConfigured()) {
      const uploaded = await uploadFile(file, folder);
      return uploaded.url;
    }

    setFallbackUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data.url;
    } finally {
      setFallbackUploading(false);
    }
  };

  const handleAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "bannerUrl" | "shieldLogoUrl" | "teamPhoto" | "galleryImage"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);

    try {
      const folder =
        target === "teamPhoto" ? "team" : target === "galleryImage" ? "gallery" : "branding";
      const url = await uploadAdminAsset(file, folder);

      if (target === "bannerUrl") {
        setSettings((prev: any) => ({ ...prev, bannerUrl: url }));
      } else if (target === "shieldLogoUrl") {
        setSettings((prev: any) => ({ ...prev, shieldLogoUrl: url }));
      } else if (target === "teamPhoto") {
        setNewMember((prev) => ({ ...prev, photoUrl: url }));
      } else if (target === "galleryImage") {
        setNewGallery((prev) => ({ ...prev, imageUrl: url }));
      }

      setStatusMsg({ type: "success", text: "Asset uploaded to Firebase Storage!" });
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Asset upload failed",
      });
    }
  };

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

  // 4. Event Status Transitions (Publish / Unpublish / Archive) & Permanent Delete (Super Admin Only)
  const handleUpdateEventStatus = async (
    eventId: string,
    nextStatus: "PUBLISHED" | "DRAFT" | "ARCHIVED",
    isRegistrationOpen?: boolean
  ) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, status: nextStatus, isRegistrationOpen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update event status.");

      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === eventId
            ? {
                ...evt,
                status: data.event?.status || nextStatus,
                isRegistrationOpen:
                  data.event?.isRegistrationOpen ?? (nextStatus === "PUBLISHED"),
              }
            : evt
        )
      );
      setArchiveEventModal(null);
      setDeleteEventModal(null);
      const label =
        nextStatus === "ARCHIVED"
          ? "archived"
          : nextStatus === "PUBLISHED"
          ? "published"
          : "unpublished (moved to Draft)";
      setStatusMsg({
        type: "success",
        text: `Event "${data.event?.title || eventId}" ${label}.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update event status",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteEventModal = async (evt: any) => {
    const initialCount = Math.max(
      Number(evt._count?.registrations || 0),
      registrations.filter((r) => r.eventId === evt.id || r.event?.id === evt.id).length
    );
    setDeleteEventModal({
      event: evt,
      registrationCount: initialCount,
      loadingCount: true,
      acknowledgeCascade: false,
      confirmPhrase: "",
    });
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/registrations?eventId=${encodeURIComponent(evt.id)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.registrations)) {
        setDeleteEventModal((prev) =>
          prev && prev.event.id === evt.id
            ? {
                ...prev,
                registrationCount: data.registrations.length,
                loadingCount: false,
              }
            : prev
        );
      } else {
        setDeleteEventModal((prev) =>
          prev && prev.event.id === evt.id ? { ...prev, loadingCount: false } : prev
        );
      }
    } catch {
      setDeleteEventModal((prev) =>
        prev && prev.event.id === evt.id ? { ...prev, loadingCount: false } : prev
      );
    }
  };

  const executeDeleteEvent = async () => {
    if (!deleteEventModal) return;
    const { event, registrationCount, acknowledgeCascade, confirmPhrase } = deleteEventModal;

    if (registrationCount > 0) {
      if (!acknowledgeCascade || confirmPhrase.trim().toUpperCase() !== "DELETE") {
        setStatusMsg({
          type: "error",
          text: "Both explicit cascade acknowledgements are required before deleting an event with registrations.",
        });
        return;
      }
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const url =
        registrationCount > 0
          ? `/api/events?id=${encodeURIComponent(event.id)}&confirmWithRegistrations=true`
          : `/api/events?id=${encodeURIComponent(event.id)}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (res.status === 409 && data.requiresRegistrationConfirmation) {
        setDeleteEventModal({
          event,
          registrationCount: Number(data.registrationCount || 1),
          loadingCount: false,
          acknowledgeCascade: false,
          confirmPhrase: "",
        });
        setStatusMsg({
          type: "error",
          text: data.error || "Registrations were found. Confirm cascade deletion explicitly.",
        });
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to delete event.");

      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setRegistrations((prev) =>
        prev.filter((r) => r.eventId !== event.id && r.event?.id !== event.id)
      );
      setDeleteEventModal(null);
      setStatusMsg({
        type: "success",
        text: data.message || `Event "${event.title}" permanently deleted.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Delete error" });
    } finally {
      setLoading(false);
    }
  };

  // 5. Post Status Transitions & Permanent Delete (Super Admin Only)
  const handleUpdatePostStatus = async (
    postId: string,
    nextStatus: "PUBLISHED" | "DRAFT" | "ARCHIVED"
  ) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update article status.");

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                status: data.post?.status || nextStatus,
                publishedAt: data.post?.publishedAt ?? p.publishedAt,
              }
            : p
        )
      );
      setStatusMsg({
        type: "success",
        text: `Article "${data.post?.title || postId}" status set to ${nextStatus}.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update article status",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeGenericDelete = async () => {
    if (!confirmGenericModal) return;
    const { type, id, title } = confirmGenericModal;
    setLoading(true);
    setStatusMsg(null);
    try {
      const endpointMap: Record<typeof type, string> = {
        post: `/api/posts?id=${encodeURIComponent(id)}`,
        resource: `/api/admin/resources?id=${encodeURIComponent(id)}`,
        team: `/api/admin/team?id=${encodeURIComponent(id)}`,
        gallery: `/api/admin/gallery?id=${encodeURIComponent(id)}`,
      };
      const res = await fetch(endpointMap[type], { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to delete ${type}.`);

      if (type === "post") {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setStatusMsg({ type: "success", text: `Article "${title}" permanently deleted.` });
      } else if (type === "resource") {
        setResources((prev) => prev.filter((r) => r.id !== id));
        if (editingResourceId === id) {
          setEditingResourceId(null);
          setNewResource({
            title: "",
            description: "",
            category: "Web Security",
            url: "",
            difficulty: "Beginner",
            isPublished: true,
          });
        }
        setStatusMsg({ type: "success", text: `Resource "${title}" deleted.` });
      } else if (type === "team") {
        setTeam((prev) => prev.filter((m) => m.id !== id));
        setStatusMsg({ type: "success", text: `Team profile "${title}" removed.` });
      } else if (type === "gallery") {
        setGallery((prev) => prev.filter((g) => g.id !== id));
        setStatusMsg({ type: "success", text: `Gallery item "${title}" deleted.` });
      }

      setConfirmGenericModal(null);
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setLoading(false);
    }
  };

  // 6. Add Team Member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add team member");

      setTeam([...team, data.member]);
      setNewMember({ name: "", role: "", category: "CORE_TEAM", bio: "", photoUrl: "", email: "", githubUrl: "", linkedinUrl: "" });
      setStatusMsg({ type: "success", text: "Team member added!" });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  };

  // 7. Create / Edit / Toggle Learning Resource
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const isEditing = Boolean(editingResourceId);
      const res = await fetch("/api/admin/resources", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? { id: editingResourceId, ...newResource } : newResource
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save resource");

      if (isEditing) {
        setResources((prev) => prev.map((r) => (r.id === editingResourceId ? data.resource : r)));
        setStatusMsg({ type: "success", text: "Learning resource updated!" });
      } else {
        setResources([data.resource, ...resources]);
        setStatusMsg({
          type: "success",
          text: newResource.isPublished
            ? "Learning resource published!"
            : "Learning resource saved as draft.",
        });
      }

      setEditingResourceId(null);
      setNewResource({
        title: "",
        description: "",
        category: "Web Security",
        url: "",
        difficulty: "Beginner",
        isPublished: true,
      });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error saving resource" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResourcePublished = async (r: any) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const nextPublished = !(r.isPublished !== false);
      const res = await fetch("/api/admin/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          url: r.url,
          difficulty: r.difficulty || "Beginner",
          isPublished: nextPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update resource visibility.");

      setResources((prev) => prev.map((item) => (item.id === r.id ? data.resource : item)));
      setStatusMsg({
        type: "success",
        text: `Resource "${r.title}" ${nextPublished ? "published" : "unpublished"}.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  };

  // 8. Role & Registration & Gallery & Message Governance Handlers
  const handleChangeUserRole = async (userId: string, nextRole: UserRole) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user role.");

      setStudents(students.map((s) => (s.id === userId ? { ...s, role: nextRole } : s)));
      setCoordinators(coordinators.map((c) => (c.id === userId ? { ...c, role: nextRole } : c)));
      setStatusMsg({ type: "success", text: `Account role updated to ${nextRole}.` });
      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Error updating role" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistrationStatus = async (regId: string, status: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: regId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update registration status.");

      setRegistrations(registrations.map((r) => (r.id === regId ? { ...r, status } : r)));
      setStatusMsg({ type: "success", text: `Registration status updated to ${status}.` });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGallery),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create gallery item.");

      setGallery([...gallery, data.item]);
      setNewGallery({ title: "", caption: "", imageUrl: "", eventTag: "" });
      setStatusMsg({ type: "success", text: "Gallery item published!" });
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Gallery error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGalleryItem = (item: any) => {
    setConfirmGenericModal({
      type: "gallery",
      id: item.id,
      title: item.title || "Gallery Item",
    });
  };

  const handleToggleMessageRead = async (id: string, currentRead: boolean) => {
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: !currentRead }),
      });
      if (res.ok) {
        setMessages(messages.map((m) => (m.id === id ? { ...m, isRead: !currentRead } : m)));
      }
    } catch {}
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
          { key: "gallery", label: `Gallery (${gallery.length})`, icon: ImageIcon },
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
              <label className="block text-brand-gray-dim mb-1">
                Administrative Contact Email (Optional)
              </label>
              <input
                type="email"
                placeholder="Optional official club email"
                value={settings.contactEmail || ""}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">
                Headquarters / Lab Location (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional campus room or lab location"
                value={settings.headquarters || ""}
                onChange={(e) => setSettings({ ...settings, headquarters: e.target.value })}
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

            <div>
              <label className="block text-brand-gray-dim mb-1">
                Instagram Handle (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional @handle (leave blank if unverified)"
                value={settings.instagramHandle || ""}
                onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">
                YouTube Channel (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional channel name or handle"
                value={settings.youtubeChannel || ""}
                onChange={(e) => setSettings({ ...settings, youtubeChannel: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div>
              <label className="block text-brand-gray-dim mb-1">
                Discord Invite (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional invite link or code"
                value={settings.discordInvite || ""}
                onChange={(e) => setSettings({ ...settings, discordInvite: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-brand-gray-dim mb-1">
                  Hero Banner Asset Upload (Firebase Storage)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => handleAssetUpload(e, "bannerUrl")}
                  className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                />
                {settings.bannerUrl && (
                  <p className="text-[11px] text-emerald-400 mt-1 truncate">
                    Current: {settings.bannerUrl}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-brand-gray-dim mb-1">
                  SB Shield Emblem Upload (Firebase Storage)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => handleAssetUpload(e, "shieldLogoUrl")}
                  className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                />
                {settings.shieldLogoUrl && (
                  <p className="text-[11px] text-emerald-400 mt-1 truncate">
                    Current: {settings.shieldLogoUrl}
                  </p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="w-full max-w-md bg-brand-black rounded-full h-2 border border-brand-border overflow-hidden">
                <div
                  className="bg-brand-red h-full transition-all duration-150"
                  style={{ width: `${Math.max(15, progress)}%` }}
                />
              </div>
            )}

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
      {/* EVENTS TAB (ARCHIVE / UNPUBLISH / PERMANENT DELETE) */}
      {/* ======================================================= */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cyber-panel p-4 rounded-lg border border-brand-border">
            <p className="text-xs font-mono text-brand-gray-dim">
              Super Admin Event Governance: publish, unpublish, archive (preserves registrations), or permanently delete events.
            </p>
            <Link
              href="/coordinator"
              className="px-3 py-1.5 bg-brand-surface hover:bg-brand-card border border-brand-border text-white text-xs font-mono font-bold rounded whitespace-nowrap text-center"
            >
              AUTHOR / EDIT EVENTS IN HUB
            </Link>
          </div>

          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Registrations</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-brand-gray-dim">
                      No events created yet.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-brand-surface/40">
                      <td className="p-3 font-bold text-white max-w-xs truncate">{evt.title}</td>
                      <td className="p-3 text-brand-gray-dim">
                        {new Date(evt.startDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-white">
                        {evt._count?.registrations || 0} / {evt.capacity}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            evt.status === "PUBLISHED"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : evt.status === "DRAFT"
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-brand-surface text-brand-gray-dim border-brand-border"
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`/events/${evt.slug}`}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-text hover:text-white rounded transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleUpdateEventStatus(
                                evt.id,
                                evt.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                                evt.status !== "PUBLISHED"
                              )
                            }
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded transition-colors disabled:opacity-50"
                          >
                            {evt.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          {evt.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => setArchiveEventModal(evt)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/70 text-amber-300 rounded transition-colors disabled:opacity-50"
                            >
                              <Archive className="w-3 h-3" />
                              <span>Archive</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => openDeleteEventModal(evt)}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-red-950/60 hover:bg-brand-red border border-red-800 text-white rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
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
      {/* POSTS TAB (PUBLISH / ARCHIVE / PERMANENT DELETE) */}
      {/* ======================================================= */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cyber-panel p-4 rounded-lg border border-brand-border">
            <p className="text-xs font-mono text-brand-gray-dim">
              Knowledge Hub Governance: toggle publication state, archive, or permanently remove articles.
            </p>
            <Link
              href="/coordinator"
              className="px-3 py-1.5 bg-brand-surface hover:bg-brand-card border border-brand-border text-white text-xs font-mono font-bold rounded whitespace-nowrap text-center"
            >
              AUTHOR / EDIT ARTICLES IN HUB
            </Link>
          </div>

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
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-brand-gray-dim">
                      No articles authored yet.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-brand-surface/40">
                      <td className="p-3 font-bold text-white max-w-xs truncate">{post.title}</td>
                      <td className="p-3 text-brand-gray-text">{post.category}</td>
                      <td className="p-3 text-brand-gray-dim">{post.createdBy?.name || "Club Author"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : post.status === "DRAFT"
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-brand-surface text-brand-gray-dim border-brand-border"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`/posts/${post.slug}`}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-text hover:text-white rounded transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleUpdatePostStatus(
                                post.id,
                                post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                              )
                            }
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded transition-colors disabled:opacity-50"
                          >
                            {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          {post.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleUpdatePostStatus(post.id, "ARCHIVED")}
                              className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/70 text-amber-300 rounded transition-colors disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              setConfirmGenericModal({
                                type: "post",
                                id: post.id,
                                title: post.title,
                              })
                            }
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-red-950/60 hover:bg-brand-red border border-red-800 text-white rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
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
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              reg.status === "CONFIRMED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-red-950 text-brand-red border border-red-800"
                            }`}
                          >
                            {reg.status}
                          </span>
                          <select
                            value={reg.status}
                            disabled={loading}
                            onChange={(e) => handleUpdateRegistrationStatus(reg.id, e.target.value)}
                            className="bg-brand-black border border-brand-border rounded px-1.5 py-0.5 text-[10px] text-white"
                          >
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="ATTENDED">ATTENDED</option>
                          </select>
                        </div>
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
                  <th className="p-3">Role</th>
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
                      <select
                        value={s.role}
                        disabled={loading}
                        onChange={(e) => handleChangeUserRole(s.id, e.target.value as UserRole)}
                        className="bg-brand-black border border-brand-border rounded px-2 py-1 text-[11px] text-white"
                      >
                        <option value={ROLES.STUDENT}>STUDENT</option>
                        <option value={ROLES.COORDINATOR}>COORDINATOR</option>
                        <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
                      </select>
                    </td>
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
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <label className="text-brand-gray-dim">Member Photo (Firebase Storage):</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => handleAssetUpload(e, "teamPhoto")}
                className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
              />
              {newMember.photoUrl && (
                <span className="text-emerald-400 text-xs">Photo uploaded!</span>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow"
            >
              ADD TEAM MEMBER
            </button>
          </form>

          {team.length === 0 ? (
            <div className="cyber-panel p-6 rounded border border-brand-border text-center text-xs font-mono text-brand-gray-dim">
              No team profiles added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => (
                <div key={m.id} className="cyber-panel p-4 rounded border border-brand-border flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{m.name}</h4>
                    <div className="text-[11px] font-mono text-brand-red font-semibold">{m.role} ({m.category})</div>
                    <p className="text-xs text-brand-gray-dim line-clamp-2 mt-1">{m.bio}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmGenericModal({
                        type: "team",
                        id: m.id,
                        title: m.name,
                      })
                    }
                    className="p-1.5 text-brand-gray-dim hover:text-brand-red"
                    aria-label={`Remove ${m.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* RESOURCES TAB */}
      {/* ======================================================= */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveResource} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
                {editingResourceId
                  ? "Edit Learning Resource"
                  : "Publish Cybersecurity Learning Resource"}
              </h3>
              {editingResourceId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingResourceId(null);
                    setNewResource({
                      title: "",
                      description: "",
                      category: "Web Security",
                      url: "",
                      difficulty: "Beginner",
                      isPublished: true,
                    });
                  }}
                  className="px-3 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-dim hover:text-white rounded text-xs font-mono"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <input
                type="text"
                required
                minLength={3}
                placeholder="Resource Title *"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="url"
                required
                placeholder="https://... *"
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <select
                value={newResource.category}
                onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              >
                {RESOURCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
                minLength={10}
                rows={2}
                placeholder="Accurate description of the verified lab, tool, or documentation link *"
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                className="w-full p-2 bg-brand-black border border-brand-border rounded text-white text-xs font-mono"
              />
            </div>
            <label className="inline-flex items-center space-x-2 text-xs font-mono text-brand-gray-text cursor-pointer">
              <input
                type="checkbox"
                checked={newResource.isPublished}
                onChange={(e) => setNewResource({ ...newResource, isPublished: e.target.checked })}
                className="rounded border-brand-border bg-brand-black text-brand-red focus:ring-brand-red"
              />
              <span>Publish visibly on public Resources page</span>
            </label>
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow"
              >
                {editingResourceId
                  ? "UPDATE RESOURCE"
                  : newResource.isPublished
                  ? "PUBLISH RESOURCE"
                  : "SAVE DRAFT RESOURCE"}
              </button>
            </div>
          </form>

          {resources.length === 0 ? (
            <div className="cyber-panel p-6 rounded border border-brand-border text-center text-xs font-mono text-brand-gray-dim">
              No resources added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((r) => {
                const isPublished = r.isPublished !== false;
                return (
                  <div
                    key={r.id}
                    className="cyber-panel p-4 rounded border border-brand-border flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">{r.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap ${
                            isPublished
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}
                        >
                          {isPublished ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-brand-red font-semibold mt-0.5">
                        {r.category} // {r.difficulty}
                      </div>
                      <p className="text-xs text-brand-gray-dim line-clamp-2 mt-1">{r.description}</p>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-brand-redBright hover:underline break-all mt-1.5 inline-block"
                      >
                        {r.url}
                      </a>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/40 text-[11px] font-mono">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setEditingResourceId(r.id);
                          setNewResource({
                            title: r.title || "",
                            description: r.description || "",
                            category: r.category || "Web Security",
                            url: r.url || "",
                            difficulty: r.difficulty || "Beginner",
                            isPublished: r.isPublished !== false,
                          });
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleToggleResourcePublished(r)}
                        className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-text hover:text-white rounded"
                      >
                        {isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          setConfirmGenericModal({
                            type: "resource",
                            id: r.id,
                            title: r.title,
                          })
                        }
                        className="p-1.5 text-brand-gray-dim hover:text-brand-red"
                        aria-label={`Delete ${r.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* GALLERY TAB */}
      {/* ======================================================= */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          <form onSubmit={handleAddGalleryItem} className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
            <h3 className="text-sm font-bold text-white font-mono border-l-2 border-brand-red pl-2">
              Upload Gallery Showcase Item (Firebase Storage)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <input
                type="text"
                required
                placeholder="Title *"
                value={newGallery.title}
                onChange={(e) => setNewGallery({ ...newGallery, title: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="text"
                placeholder="Event Tag (Optional)"
                value={newGallery.eventTag}
                onChange={(e) => setNewGallery({ ...newGallery, eventTag: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
              <input
                type="text"
                placeholder="Caption (Optional)"
                value={newGallery.caption}
                onChange={(e) => setNewGallery({ ...newGallery, caption: e.target.value })}
                className="p-2 bg-brand-black border border-brand-border rounded text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => handleAssetUpload(e, "galleryImage")}
                className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
              />
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-brand-red" />}
              {newGallery.imageUrl && (
                <span className="text-emerald-400">Image attached!</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newGallery.imageUrl}
              className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow disabled:opacity-50"
            >
              ADD TO GALLERY
            </button>
          </form>

          {gallery.length === 0 ? (
            <div className="cyber-panel p-6 rounded border border-brand-border text-center text-xs font-mono text-brand-gray-dim">
              No gallery items uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((item) => (
                <div key={item.id} className="cyber-panel p-4 rounded border border-brand-border space-y-3">
                  <div className="relative w-full h-40 rounded overflow-hidden bg-brand-black border border-brand-border">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      {item.eventTag && (
                        <span className="text-[10px] font-mono text-brand-redBright">{item.eventTag}</span>
                      )}
                      {item.caption && (
                        <p className="text-xs text-brand-gray-dim mt-1">{item.caption}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryItem(item)}
                      className="p-1.5 text-brand-gray-dim hover:text-brand-red"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-brand-gray-dim">
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
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleMessageRead(m.id, Boolean(m.isRead))}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            m.isRead
                              ? "bg-brand-surface text-brand-gray-dim border-brand-border"
                              : "bg-emerald-950 text-emerald-400 border-emerald-800"
                          }`}
                        >
                          {m.isRead ? "READ" : "MARK READ"}
                        </button>
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
      {/* ======================================================= */}
      {/* STRUCTURED GOVERNANCE MODALS */}
      {/* ======================================================= */}
      {deleteEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-modal-title"
        >
          <div className="w-full max-w-lg cyber-panel rounded-lg border border-red-800/80 bg-brand-surface p-6 space-y-4 shadow-2xl">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded bg-red-950/80 border border-red-800 text-brand-redBright">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-event-modal-title" className="text-base font-bold text-white font-mono">
                  Confirm Permanent Event Deletion
                </h3>
                <p className="text-xs text-brand-gray-muted font-sans mt-0.5">
                  This action permanently erases database records and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-brand-black border border-brand-border space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-brand-gray-dim">Event Title: </span>
                <span className="text-white font-bold">{deleteEventModal.event.title}</span>
              </div>
              <div>
                <span className="text-brand-gray-dim">Current Status: </span>
                <span className="text-white">{deleteEventModal.event.status}</span>
              </div>
              <div>
                <span className="text-brand-gray-dim">Linked Registrations: </span>
                {deleteEventModal.loadingCount ? (
                  <span className="text-amber-400">Checking registration records...</span>
                ) : (
                  <span
                    className={
                      deleteEventModal.registrationCount > 0
                        ? "text-brand-redBright font-bold"
                        : "text-emerald-400 font-bold"
                    }
                  >
                    {deleteEventModal.registrationCount} registration record(s)
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-brand-gray-text font-sans leading-relaxed">
              Deleting this event will permanently remove the event document and{" "}
              <strong className="text-white">
                {deleteEventModal.registrationCount} associated student registration record(s)
              </strong>
              , along with recording a permanent deletion audit log entry. It will immediately stop appearing on public pages.
            </p>

            {deleteEventModal.registrationCount > 0 && (
              <div className="p-3.5 rounded border border-amber-700/70 bg-amber-950/30 space-y-3">
                <div className="text-xs text-amber-200 font-sans leading-relaxed">
                  <strong className="font-mono uppercase text-amber-300 block mb-1">
                    Recommended Alternative: Archive Instead
                  </strong>
                  Student registrations exist for this event. Archiving hides the event from public listings and closes sign-ups while preserving student attendance records.
                </div>

                <label className="flex items-start space-x-2 text-xs text-white font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteEventModal.acknowledgeCascade}
                    onChange={(e) =>
                      setDeleteEventModal({
                        ...deleteEventModal,
                        acknowledgeCascade: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-red-700 bg-brand-black text-brand-red"
                  />
                  <span>
                    I understand {deleteEventModal.registrationCount} registration record(s) will be permanently deleted alongside this event.
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] font-mono text-brand-gray-dim mb-1">
                    Type <strong className="text-white">DELETE</strong> to enable permanent cascade deletion:
                  </label>
                  <input
                    type="text"
                    value={deleteEventModal.confirmPhrase}
                    onChange={(e) =>
                      setDeleteEventModal({
                        ...deleteEventModal,
                        confirmPhrase: e.target.value,
                      })
                    }
                    placeholder="DELETE"
                    className="w-full p-2 bg-brand-black border border-red-800/70 rounded text-xs font-mono text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-brand-border/60 text-xs font-mono">
              <button
                type="button"
                disabled={loading}
                onClick={() => setDeleteEventModal(null)}
                className="px-3 py-1.5 bg-brand-black hover:bg-brand-card border border-brand-border text-brand-gray-dim hover:text-white rounded"
              >
                Cancel
              </button>
              {deleteEventModal.event.status !== "ARCHIVED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleUpdateEventStatus(deleteEventModal.event.id, "ARCHIVED", false)
                  }
                  className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-200 font-bold rounded"
                >
                  Archive Event Instead
                </button>
              )}
              <button
                type="button"
                disabled={
                  loading ||
                  deleteEventModal.loadingCount ||
                  (deleteEventModal.registrationCount > 0 &&
                    (!deleteEventModal.acknowledgeCascade ||
                      deleteEventModal.confirmPhrase.trim().toUpperCase() !== "DELETE"))
                }
                onClick={executeDeleteEvent}
                className="px-4 py-1.5 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? "DELETING..."
                  : deleteEventModal.registrationCount > 0
                  ? "PERMANENTLY DELETE EVENT & REGISTRATIONS"
                  : "PERMANENTLY DELETE EVENT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-event-modal-title"
        >
          <div className="w-full max-w-md cyber-panel rounded-lg border border-amber-800/80 bg-brand-surface p-6 space-y-4 shadow-2xl">
            <h3 id="archive-event-modal-title" className="text-base font-bold text-white font-mono">
              Archive Event?
            </h3>
            <p className="text-xs text-brand-gray-text font-sans leading-relaxed">
              Archiving <strong className="text-white">{archiveEventModal.title}</strong> removes it from public event listings and closes registrations, while preserving all{" "}
              <strong className="text-white">{archiveEventModal._count?.registrations || 0}</strong> existing student registration record(s).
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60 text-xs font-mono">
              <button
                type="button"
                disabled={loading}
                onClick={() => setArchiveEventModal(null)}
                className="px-3 py-1.5 bg-brand-black hover:bg-brand-card border border-brand-border text-brand-gray-dim hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleUpdateEventStatus(archiveEventModal.id, "ARCHIVED", false)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded"
              >
                CONFIRM ARCHIVE
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmGenericModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="generic-delete-modal-title"
        >
          <div className="w-full max-w-md cyber-panel rounded-lg border border-red-800/80 bg-brand-surface p-6 space-y-4 shadow-2xl">
            <h3 id="generic-delete-modal-title" className="text-base font-bold text-white font-mono">
              Confirm Permanent Removal
            </h3>
            <p className="text-xs text-brand-gray-text font-sans leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">{confirmGenericModal.title}</strong>? This action removes the record immediately and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60 text-xs font-mono">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmGenericModal(null)}
                className="px-3 py-1.5 bg-brand-black hover:bg-brand-card border border-brand-border text-brand-gray-dim hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeGenericDelete}
                className="px-4 py-1.5 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow"
              >
                PERMANENTLY DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

