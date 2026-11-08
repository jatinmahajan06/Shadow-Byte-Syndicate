"use client";

import React, { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeliveryNote(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setSuccessMsg(data.message || "Message dispatched successfully.");
      if (data.emailDelivery?.provider === "CONSOLE_DEV") {
        setDeliveryNote("Development Notice: SMTP not configured. Form inquiry saved securely to the database and logged to the server console.");
      }

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-border space-y-4 relative">
      <div className="corner-bracket-tl"></div>
      <div className="corner-bracket-tr"></div>
      <div className="corner-bracket-bl"></div>
      <div className="corner-bracket-br"></div>

      <div className="border-l-2 border-brand-red pl-3 mb-4">
        <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">TRANSMISSION PORT</span>
        <h3 className="text-xl font-bold text-white">Direct Message Transmission</h3>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded text-xs font-mono text-emerald-400 space-y-1">
          <div className="flex items-center space-x-2 font-bold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          {deliveryNote && <p className="text-brand-gray-dim text-[11px] pt-1">{deliveryNote}</p>}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs font-mono text-brand-redBright flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-brand-gray-dim mb-1">Your Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ada Lovelace"
            className="w-full p-2.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white focus:outline-none focus:border-brand-red"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-brand-gray-dim mb-1">Your Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ada@college.edu"
            className="w-full p-2.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white focus:outline-none focus:border-brand-red"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-brand-gray-dim mb-1">Subject *</label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Workshop Inquiry / Academic Partnership"
          className="w-full p-2.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white focus:outline-none focus:border-brand-red"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-brand-gray-dim mb-1">Message *</label>
        <textarea
          required
          rows={5}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="State your question or inquiry with specific details..."
          className="w-full p-2.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white focus:outline-none focus:border-brand-red"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        <span>SEND TRANSMISSION</span>
      </button>
    </form>
  );
}
