import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, Lock, Terminal, Globe, ExternalLink, Mail } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function Footer() {
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
                  src="/assets/brand/shield-emblem.png"
                  alt="Shadow Byte Syndicate SB Shield Logo"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <span className="font-extrabold tracking-wider text-white text-base block">
                  {BRAND.name}
                </span>
                <span className="text-[10px] font-mono tracking-widest text-brand-red uppercase font-semibold">
                  {BRAND.supportingLine}
                </span>
              </div>
            </div>

            <p className="text-xs text-brand-gray-muted leading-relaxed font-mono">
              &ldquo;{BRAND.mainTagline}&rdquo;
            </p>

            <div className="inline-block px-2.5 py-1 bg-brand-redDark/30 border border-brand-red/40 rounded text-[11px] font-mono text-brand-redBright tracking-widest uppercase">
              {BRAND.secondaryPhrase}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-l-2 border-brand-red pl-2">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-mono text-brand-gray-text">
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

          {/* Connect & Socials (Unverified Handles from Banner Artwork) */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-l-2 border-brand-red pl-2">
              Syndicate Channels
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-brand-card border border-brand-border rounded">
                <span className="text-[10px] text-brand-gray-dim uppercase block">Instagram</span>
                <span className="text-brand-gray-text">{BRAND.socials.instagram}</span>
              </div>
              <div className="p-2.5 bg-brand-card border border-brand-border rounded">
                <span className="text-[10px] text-brand-gray-dim uppercase block">YouTube</span>
                <span className="text-brand-gray-text">{BRAND.socials.youtube}</span>
              </div>
              <div className="p-2.5 bg-brand-card border border-brand-border rounded">
                <span className="text-[10px] text-brand-gray-dim uppercase block">Discord</span>
                <span className="text-brand-gray-text">{BRAND.socials.discord}</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-brand-gray-dim italic">
              Note: Social handles originate from brand artwork assets and are configurable in administrative settings.
            </p>
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
