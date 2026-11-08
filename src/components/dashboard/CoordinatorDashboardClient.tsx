"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  BookOpen,
  Plus,
  Edit,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Archive,
  FileText,
} from "lucide-react";
import { PUBLISH_STATUS, EVENT_MODES } from "@/lib/constants";

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

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

      setStatusMsg({ type: "success", text: isNewPost ? "Post published!" : "Post updated!" });
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

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (targetField === "eventBanner" && editingEvent) {
        setEditingEvent({ ...editingEvent, bannerUrl: data.url });
      } else if (targetField === "postCover" && editingPost) {
        setEditingPost({ ...editingPost, coverImage: data.url });
      }
      setStatusMsg({ type: "success", text: "Image successfully uploaded and attached!" });
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Upload error",
      });
    } finally {
      setUploading(false);
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
                    venue: "Cyber Defense Lab",
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
                <div>
                  <label className="block text-brand-gray-dim mb-1">
                    Banner Image (JPEG, PNG, WebP only - max 5MB)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, "eventBanner")}
                      className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin text-brand-red" />}
                    {editingEvent.bannerUrl && (
                      <span className="text-emerald-400 text-xs">Banner Attached!</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-brand-border/60">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{isNewEvent ? "SAVE & PUBLISH EVENT" : "UPDATE EVENT"}</span>
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
                {events.map((evt) => (
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.status === "PUBLISHED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : evt.status === "DRAFT"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-brand-surface text-brand-gray-dim"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setIsNewEvent(false);
                          setEditingEvent(evt);
                        }}
                        className="px-2.5 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                      >
                        Edit
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
                    tags: "cybersecurity, research",
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
                <div>
                  <label className="block text-brand-gray-dim mb-1">Cover Image (Optional)</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, "postCover")}
                      className="text-xs text-brand-gray-dim file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-mono file:bg-brand-surface file:text-white"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin text-brand-red" />}
                    {editingPost.coverImage && (
                      <span className="text-emerald-400 text-xs">Image Attached!</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-brand-border/60">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-brand-red hover:bg-brand-redBright text-white font-bold rounded shadow-red-glow flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{isNewPost ? "PUBLISH ARTICLE" : "UPDATE ARTICLE"}</span>
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
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-brand-surface/40 transition-colors">
                    <td className="p-3 font-bold text-white max-w-xs truncate">{post.title}</td>
                    <td className="p-3 text-brand-gray-text">{post.category}</td>
                    <td className="p-3 text-brand-gray-dim">{post.createdBy.name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          post.status === "PUBLISHED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setIsNewPost(false);
                          setEditingPost(post);
                        }}
                        className="px-2.5 py-1 bg-brand-surface hover:bg-brand-card border border-brand-border text-white rounded"
                      >
                        Edit
                      </button>
                    </td>
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
