"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Archive,
  Eye,
} from "lucide-react";
import { PUBLISH_STATUS, EVENT_MODES } from "@/lib/constants";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useAuth } from "@/hooks/useAuth";
import { deleteStorageObject } from "@/firebase/storage";
import { isFirebaseConfigured } from "@/firebase/config";

interface EventItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  bannerUrl: string | null;
  mode: string;
  venue: string;
  locationUrl: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity: number;
  status: string;
  isRegistrationOpen: boolean;
  category: string;
  createdBy: { name: string; email: string };
  _count: { registrations: number };
}

interface PostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string | null;
  status: string;
  publishedAt: string | null;
  createdBy: { name: string; email: string };
}

interface Props {
  initialEvents: EventItem[];
  initialPosts: PostItem[];
  currentUserRole: string;
}

export default function CoordinatorDashboardClient({
  initialEvents,
  initialPosts,
  currentUserRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<"events" | "posts">("events");
  const [events, setEvents] = useState(initialEvents);
  const [posts, setPosts] = useState(initialPosts);

  // Modal / Form state for Events
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);

  // Modal / Form state for Posts
  const [editingPost, setEditingPost] = useState<Partial<PostItem> | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);

  // Explicit archive confirmation state for Coordinators
  const [archiveConfirmEvent, setArchiveConfirmEvent] = useState<EventItem | null>(null);

  const { firebaseUser } = useAuth();
  const { uploadFile, uploading: storageUploading, progress } = useStorageUpload();
  const [loading, setLoading] = useState(false);
  const [fallbackUploading, setFallbackUploading] = useState(false);
  const uploading = storageUploading || fallbackUploading;
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const router = useRouter();

  // Handle Event Save (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const method = isNewEvent ? "POST" : "PUT";
      const res = await fetch("/api/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEvent),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save event.");
      }

      setStatusMsg({ type: "success", text: isNewEvent ? "Event created!" : "Event updated!" });
      setEditingEvent(null);
      setIsNewEvent(false);

      // Refresh list
      const fetchRes = await fetch("/api/events?status=ALL");
      const listData = await fetchRes.json();
      if (listData.events) setEvents(listData.events);

      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving event",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Post Save (Create or Update)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const method = isNewPost ? "POST" : "PUT";
      const res = await fetch("/api/posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPost),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save post.");
      }

      setStatusMsg({
        type: "success",
        text: isNewPost
          ? editingPost.status === "PUBLISHED"
            ? "Article published!"
            : "Article saved as draft!"
          : "Article updated!",
      });
      setEditingPost(null);
      setIsNewPost(false);

      const fetchRes = await fetch("/api/posts?status=ALL");
      const listData = await fetchRes.json();
      if (listData.posts) setPosts(listData.posts);

      router.refresh();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving post",
      });
    } finally {
      setLoading(false);
    }
  };

  // Coordinator quick status transitions: Publish / Unpublish (Draft) / Archive
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
      setArchiveConfirmEvent(null);
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
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: data.post?.status || nextStatus,
                publishedAt: data.post?.publishedAt ?? post.publishedAt,
              }
            : post
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

  // Image Upload Handler (Firebase Storage direct upload with progress + server Admin Storage fallback)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const folder = targetField === "eventBanner" ? "events" : "posts";
    setStatusMsg(null);

    try {
      let url = "";

      if (firebaseUser && isFirebaseConfigured()) {
        const result = await uploadFile(file, folder);
        url = result.url;
      } else {
        setFallbackUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        url = data.url;
      }

      if (targetField === "eventBanner" && editingEvent) {
        setEditingEvent({ ...editingEvent, bannerUrl: url });
      } else if (targetField === "postCover" && editingPost) {
        setEditingPost({ ...editingPost, coverImage: url });
      }
      setStatusMsg({ type: "success", text: "Image successfully uploaded to Firebase Storage!" });
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Upload error",
      });
    } finally {
      setFallbackUploading(false);
    }
  };

  const handleRemoveUploadedImage = async (targetField: string, url?: string | null) => {
    if (url) {
      await deleteStorageObject(url).catch(() => {});
    }
    if (targetField === "eventBanner" && editingEvent) {
      setEditingEvent({ ...editingEvent, bannerUrl: null });
    } else if (targetField === "postCover" && editingPost) {
      setEditingPost({ ...editingPost, coverImage: null });
    }
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

      {/* Tabs */}
      <div className="flex items-center space-x-3 border-b border-brand-border/80 pb-2">
        <button
          onClick={() => {
            setActiveTab("events");
            setEditingEvent(null);
          }}
          className={`px-4 py-2 rounded text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
            activeTab === "events"
              ? "bg-brand-red text-white shadow-red-glow-sm"
              : "bg-brand-surface text-brand-gray-dim hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>EVENT MANAGEMENT ({events.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("posts");
            setEditingPost(null);
          }}
          className={`px-4 py-2 rounded text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
            activeTab === "posts"
              ? "bg-brand-red text-white shadow-red-glow-sm"
              : "bg-brand-surface text-brand-gray-dim hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>KNOWLEDGE HUB ARTICLES ({posts.length})</span>
        </button>
      </div>

      {/* ======================================================= */}
      {/* 1. EVENTS MODULE */}
      {/* ======================================================= */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-mono">Club Events & CTFs</h2>
            {!editingEvent && (
              <button
                onClick={() => {
                  setIsNewEvent(true);
                  setEditingEvent({
                    title: "",
                    slug: "",
                    summary: "",
                    description: "",
                    mode: EVENT_MODES.IN_PERSON,
                    venue: "",
                    startDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
                    endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3 * 3600 * 1000)
                      .toISOString()
                      .slice(0, 16),
                    registrationDeadline: new Date(Date.now() + 6 * 24 * 3600 * 1000)
                      .toISOString()
                      .slice(0, 16),
                    capacity: 50,
                    status: PUBLISH_STATUS.DRAFT,
                    isRegistrationOpen: true,
                    category: "Workshop",
                  });
                }}
                className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE NEW EVENT</span>
              </button>
            )}
          </div>

          {/* Event Editor Form */}
          {editingEvent && (
            <div className="cyber-panel p-6 rounded-lg border border-brand-red/50 space-y-4">
              <h3 className="text-base font-bold text-white font-mono border-l-2 border-brand-red pl-2">
                {isNewEvent ? "Author New Event" : `Edit Event: ${editingEvent.title}`}
              </h3>

              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title || ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        const slug = title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, "");
                        setEditingEvent({
                          ...editingEvent,
                          title,
                          slug: isNewEvent ? slug : editingEvent.slug,
                        });
                      }}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">URL Slug (lowercase-dashes) *</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.slug || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, slug: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-gray-dim mb-1">Short Summary (Preview Card) *</label>
                  <textarea
                    rows={2}
                    required
                    value={editingEvent.summary || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, summary: e.target.value })}
                    className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                  />
                </div>

                <div>
                  <label className="block text-brand-gray-dim mb-1">Detailed Description (Markdown / Curriculum) *</label>
                  <textarea
                    rows={6}
                    required
                    value={editingEvent.description || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    className="w-full p-2 bg-brand-black border border-brand-border rounded text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Event Mode</label>
                    <select
                      value={editingEvent.mode || EVENT_MODES.IN_PERSON}
                      onChange={(e) => setEditingEvent({ ...editingEvent, mode: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    >
                      <option value="IN_PERSON">In-Person</option>
                      <option value="VIRTUAL">Virtual</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Category</label>
                    <input
                      type="text"
                      value={editingEvent.category || "Workshop"}
                      onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Seat Capacity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingEvent.capacity || 50}
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, capacity: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Venue / Room *</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.venue || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Publication Status</label>
                    <select
                      value={editingEvent.status || PUBLISH_STATUS.DRAFT}
                      onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white font-bold"
                    >
                      <option value="DRAFT">Draft (Unpublished)</option>
                      <option value="PUBLISHED">Published (Visible on Public Site)</option>
                      <option value="ARCHIVED">Archived (Past Event)</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={
                        editingEvent.startDate ? editingEvent.startDate.toString().slice(0, 16) : ""
                      }
                      onChange={(e) => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">End Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={
                        editingEvent.endDate ? editingEvent.endDate.toString().slice(0, 16) : ""
                      }
                      onChange={(e) => setEditingEvent({ ...editingEvent, endDate: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Registration Deadline *</label>
                    <input
                      type="datetime-local"
                      required
                      value={
                        editingEvent.registrationDeadline
                          ? editingEvent.registrationDeadline.toString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, registrationDeadline: e.target.value })
                      }
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <label className="block text-brand-gray-dim mb-1">
                    Banner Image (Firebase Storage: JPEG, PNG, WebP only - max 5MB)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => handleImageUpload(e, "eventBanner")}
                      className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                    />
                    {uploading && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
                        <span className="text-xs text-brand-gray-text">{progress || 50}%</span>
                      </div>
                    )}
                    {editingEvent.bannerUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedImage("eventBanner", editingEvent.bannerUrl)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-red-950/50 border border-red-800 rounded text-brand-redBright text-xs hover:bg-brand-red hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Banner</span>
                      </button>
                    )}
                  </div>
                  {uploading && (
                    <div className="w-full max-w-sm bg-brand-black rounded-full h-1.5 border border-brand-border overflow-hidden">
                      <div
                        className="bg-brand-red h-full transition-all duration-150"
                        style={{ width: `${Math.max(15, progress)}%` }}
                      />
                    </div>
                  )}
                  {editingEvent.bannerUrl && (
                    <div className="relative w-full max-w-md h-36 rounded border border-brand-border overflow-hidden bg-brand-black">
                      <Image
                        src={editingEvent.bannerUrl}
                        alt="Event banner preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-brand-border/60">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>
                      {isNewEvent
                        ? editingEvent.status === "PUBLISHED"
                          ? "SAVE & PUBLISH EVENT"
                          : "SAVE EVENT"
                        : "UPDATE EVENT"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      setIsNewEvent(false);
                    }}
                    className="px-4 py-2 bg-brand-surface hover:bg-brand-card text-brand-gray-dim hover:text-white rounded"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Events Table */}
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Registrations</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-brand-gray-dim">
                      No events created yet.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-brand-surface/40 transition-colors">
                      <td className="p-3 font-bold text-white max-w-xs truncate">{evt.title}</td>
                      <td className="p-3 text-brand-gray-text">{evt.category}</td>
                      <td className="p-3 text-brand-gray-dim">
                        {new Date(evt.startDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-brand-gray-text">
                        {evt._count.registrations} / {evt.capacity}
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
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-text hover:text-white rounded"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewEvent(false);
                              setEditingEvent(evt);
                            }}
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                          >
                            Edit
                          </button>
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
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded disabled:opacity-50"
                          >
                            {evt.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          {evt.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => setArchiveConfirmEvent(evt)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/70 text-amber-300 rounded disabled:opacity-50"
                            >
                              <Archive className="w-3 h-3" />
                              <span>Archive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] font-mono text-brand-gray-dim">
            Note: Coordinators can publish, unpublish, or archive events while preserving registration history. Permanent deletion is restricted to Super Administrators{currentUserRole === "SUPER_ADMIN" ? " via the Admin Control Panel" : ""}.
          </p>
        </div>
      )}

      {/* ======================================================= */}
      {/* 2. POSTS MODULE */}
      {/* ======================================================= */}
      {activeTab === "posts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-mono">Knowledge Hub Articles</h2>
            {!editingPost && (
              <button
                onClick={() => {
                  setIsNewPost(true);
                  setEditingPost({
                    title: "",
                    slug: "",
                    excerpt: "",
                    content: "",
                    category: "Security Research",
                    tags: "",
                    status: PUBLISH_STATUS.DRAFT,
                  });
                }}
                className="px-4 py-2 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>AUTHOR NEW ARTICLE</span>
              </button>
            )}
          </div>

          {/* Post Editor Form */}
          {editingPost && (
            <div className="cyber-panel p-6 rounded-lg border border-brand-red/50 space-y-4">
              <h3 className="text-base font-bold text-white font-mono border-l-2 border-brand-red pl-2">
                {isNewPost ? "Author Knowledge Hub Article" : `Edit Article: ${editingPost.title}`}
              </h3>

              <form onSubmit={handleSavePost} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Article Title *</label>
                    <input
                      type="text"
                      required
                      value={editingPost.title || ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        const slug = title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, "");
                        setEditingPost({
                          ...editingPost,
                          title,
                          slug: isNewPost ? slug : editingPost.slug,
                        });
                      }}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={editingPost.slug || ""}
                      onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-gray-dim mb-1">Excerpt (Card Preview) *</label>
                  <textarea
                    rows={2}
                    required
                    value={editingPost.excerpt || ""}
                    onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                    className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                  />
                </div>

                <div>
                  <label className="block text-brand-gray-dim mb-1">Full Article Content (Markdown) *</label>
                  <textarea
                    rows={8}
                    required
                    value={editingPost.content || ""}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    className="w-full p-2 bg-brand-black border border-brand-border rounded text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-brand-gray-dim mb-1">Category</label>
                    <select
                      value={editingPost.category || "Security Research"}
                      onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    >
                      <option value="Security Research">Security Research</option>
                      <option value="Defensive Security">Defensive Security</option>
                      <option value="Web Security">Web Security</option>
                      <option value="Binary Exploitation">Binary Exploitation</option>
                      <option value="Reverse Engineering">Reverse Engineering</option>
                      <option value="Digital Forensics">Digital Forensics</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={editingPost.tags || ""}
                      onChange={(e) => setEditingPost({ ...editingPost, tags: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-gray-dim mb-1">Publication Status</label>
                    <select
                      value={editingPost.status || PUBLISH_STATUS.DRAFT}
                      onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value })}
                      className="w-full p-2 bg-brand-black border border-brand-border rounded text-white font-bold"
                    >
                      <option value="DRAFT">Draft (Unpublished)</option>
                      <option value="PUBLISHED">Published (Live)</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <label className="block text-brand-gray-dim mb-1">
                    Cover Image (Optional - Firebase Storage: JPEG, PNG, WebP max 5MB)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => handleImageUpload(e, "postCover")}
                      className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                    />
                    {uploading && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
                        <span className="text-xs text-brand-gray-text">{progress || 50}%</span>
                      </div>
                    )}
                    {editingPost.coverImage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedImage("postCover", editingPost.coverImage)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-red-950/50 border border-red-800 rounded text-brand-redBright text-xs hover:bg-brand-red hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Cover</span>
                      </button>
                    )}
                  </div>
                  {uploading && (
                    <div className="w-full max-w-sm bg-brand-black rounded-full h-1.5 border border-brand-border overflow-hidden">
                      <div
                        className="bg-brand-red h-full transition-all duration-150"
                        style={{ width: `${Math.max(15, progress)}%` }}
                      />
                    </div>
                  )}
                  {editingPost.coverImage && (
                    <div className="relative w-full max-w-md h-36 rounded border border-brand-border overflow-hidden bg-brand-black">
                      <Image
                        src={editingPost.coverImage}
                        alt="Article cover preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-brand-border/60">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>
                      {isNewPost
                        ? editingPost.status === "PUBLISHED"
                          ? "PUBLISH ARTICLE"
                          : "SAVE DRAFT ARTICLE"
                        : "UPDATE ARTICLE"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPost(null);
                      setIsNewPost(false);
                    }}
                    className="px-4 py-2 bg-brand-surface hover:bg-brand-card text-brand-gray-dim hover:text-white rounded"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Posts Table */}
          <div className="cyber-panel rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surface text-brand-gray-dim uppercase border-b border-brand-border">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
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
                    <tr key={post.id} className="hover:bg-brand-surface/40 transition-colors">
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
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-gray-text hover:text-white rounded"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewPost(false);
                              setEditingPost(post);
                            }}
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleUpdatePostStatus(
                                post.id,
                                post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                              )
                            }
                            className="px-2 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded disabled:opacity-50"
                          >
                            {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          {post.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleUpdatePostStatus(post.id, "ARCHIVED")}
                              className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/70 text-amber-300 rounded disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
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

      {/* Coordinator Archive Confirmation Modal */}
      {archiveConfirmEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coordinator-archive-modal-title"
        >
          <div className="w-full max-w-md cyber-panel rounded-lg border border-amber-800/80 bg-brand-surface p-6 space-y-4 shadow-2xl">
            <h3 id="coordinator-archive-modal-title" className="text-base font-bold text-white font-mono">
              Archive Event?
            </h3>
            <p className="text-xs text-brand-gray-text font-sans leading-relaxed">
              Archiving <strong className="text-white">{archiveConfirmEvent.title}</strong> removes it from public event listings and closes registrations while{" "}
              <strong className="text-white">
                preserving all {archiveConfirmEvent._count.registrations} existing student registration record(s)
              </strong>
              . Permanent deletion is reserved for Super Administrators.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60 text-xs font-mono">
              <button
                type="button"
                disabled={loading}
                onClick={() => setArchiveConfirmEvent(null)}
                className="px-3 py-1.5 bg-brand-black hover:bg-brand-card border border-brand-border text-brand-gray-dim hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleUpdateEventStatus(archiveConfirmEvent.id, "ARCHIVED", false)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded"
              >
                CONFIRM ARCHIVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

