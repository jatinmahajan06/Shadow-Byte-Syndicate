import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { getSiteSettings } from "@/services/siteService";

export default async function Footer() {
  const settings = await getSiteSettings().catch(() => null);
  const clubName = settings?.clubName || BRAND.name;
  const supportingLine = settings?.supportingLine || BRAND.supportingLine;
  const mainTagline = settings?.mainTagline || BRAND.mainTagline;
  const secondaryPhrase = settings?.secondaryPhrase || BRAND.secondaryPhrase;
  const shieldUrl = settings?.shieldLogoUrl || "/assets/brand/shield-emblem.png";
  const instagram = settings?.instagramHandle?.trim() || "";
  const youtube = settings?.youtubeChannel?.trim() || "";
  const discord = settings?.discordInvite?.trim() || "";
  const contactEmail = settings?.contactEmail?.trim() || "";

  const channels = [
    instagram ? { label: "Instagram", value: instagram } : null,
    youtube ? { label: "YouTube", value: youtube } : null,
    discord ? { label: "Discord", value: discord } : null,
    contactEmail ? { label: "Contact Email", value: contactEmail } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <footer className="bg-brand-black border-t border-brand-border/80 pt-16 pb-12 relative overflow-hidden">
      {/* Subtle background red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-brand-redDark/10 blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-full border border-brand-red/50 overflow-hidden bg-brand-card p-0.5">
                <Image
                  src={shieldUrl}
                  alt="Shadow Byte Syndicate SB Shield Logo"
                  width={40}
                  height={40}
                  unoptimized
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <span className="font-extrabold tracking-wider text-white text-base block">
                  {clubName}
                </span>
                <span className="text-[10px] font-mono tracking-widest text-brand-red uppercase font-semibold">
                  {supportingLine}
                </span>
              </div>
            </div>

            <p className="text-xs text-brand-gray-muted leading-relaxed font-mono">
              &ldquo;{mainTagline}&rdquo;
            </p>

            <div className="inline-block px-2.5 py-1 bg-brand-redDark/30 border border-brand-red/40 rounded text-[11px] font-mono text-brand-redBright tracking-widest uppercase">
              {secondaryPhrase}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-l-2 border-brand-red pl-2">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-mono text-brand-gray-text">
              <li>
                <Link href="/" className="hover:text-brand-redBright transition-colors">
                  &gt; Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand-redBright transition-colors">
                  &gt; About & Faculty Advisor
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-brand-redBright transition-colors">
                  &gt; Workshops & CTFs
                </Link>
              </li>
              <li>
                <Link href="/posts" className="hover:text-brand-redBright transition-colors">
                  &gt; Knowledge Hub & Research
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-brand-redBright transition-colors">
                  &gt; Learning Resources & Labs
                </Link>
              </li>
              <li>
                <Link href="/team" className="hover:text-brand-redBright transition-colors">
                  &gt; Syndicate Leads & Team
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-redBright transition-colors">
                  &gt; Contact & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Dedicated Role Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-l-2 border-brand-red pl-2">
              System Access
            </h4>
            <ul className="space-y-2 text-xs font-mono text-brand-gray-text">
              <li>
                <Link href="/login/student" className="hover:text-white flex items-center space-x-1.5">
                  <span className="text-brand-red">&gt;</span>
                  <span>Student Portal Login</span>
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white flex items-center space-x-1.5">
                  <span className="text-brand-red">&gt;</span>
                  <span>Student Registration</span>
                </Link>
              </li>
              <li>
                <Link href="/login/coordinator" className="hover:text-white flex items-center space-x-1.5">
                  <span className="text-brand-red">&gt;</span>
                  <span>Coordinator Login</span>
                </Link>
              </li>
              <li>
                <Link href="/login/super-admin" className="hover:text-white flex items-center space-x-1.5">
                  <span className="text-brand-red">&gt;</span>
                  <span>Super Admin Portal</span>
                </Link>
              </li>
              <li>
                <Link href="/about#ethics" className="hover:text-white flex items-center space-x-1.5">
                  <span className="text-brand-red">&gt;</span>
                  <span>Responsible Disclosure Policy</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Configured Official Channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-l-2 border-brand-red pl-2">
              Official Channels
            </h4>
            {channels.length === 0 ? (
              <div className="p-3 bg-brand-card border border-brand-border rounded space-y-2 text-xs font-mono">
                <p className="text-brand-gray-muted">
                  No social or external channels configured yet.
                </p>
                <Link
                  href="/contact"
                  className="inline-block text-brand-redBright hover:underline font-semibold"
                >
                  Use Contact Form &gt;
                </Link>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono">
                {channels.map((ch) => (
                  <div key={ch.label} className="p-2.5 bg-brand-card border border-brand-border rounded">
                    <span className="text-[10px] text-brand-gray-dim uppercase block">{ch.label}</span>
                    <span className="text-brand-gray-text break-all">{ch.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar & Ethical Disclaimer */}
        <div className="pt-8 border-t border-brand-border/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-brand-gray-dim">
          <p>
            &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex items-center space-x-2 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-brand-red" />
            <span>Dedicated to ethical cybersecurity research, defensive education, and responsible practice.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

