import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/services/siteService";
import { Shield, Terminal, Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="relative overflow-x-hidden">
      {/* HOME / HERO SECTION */}
      <section className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center py-8 sm:py-10 lg:py-14 overflow-hidden bg-cyber-grid">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-brand-redDark/15 blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Terminal initialization status line */}
          <div className="max-w-4xl mx-auto mb-5 flex flex-wrap items-center justify-between text-[11px] font-mono text-brand-gray-dim bg-brand-card/80 border border-brand-border px-3 py-1.5 rounded">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-brand-gray-text font-bold">&gt;&gt; SECURE SYSTEM TERMINAL</span>
            </div>
            <div className="text-brand-redBright hidden sm:block">STATUS: AUTHORIZED // ACCESS GRANTED</div>
          </div>

          {/* Desktop/Tablet Official Artwork Viewport Frame */}
          <div className="hidden sm:block relative rounded-lg border-2 border-brand-border/80 overflow-hidden bg-brand-card shadow-red-glow mb-8 group transition-all hover:border-brand-red/60">
            <div className="corner-bracket-tl"></div>
            <div className="corner-bracket-tr"></div>
            <div className="corner-bracket-bl"></div>
            <div className="corner-bracket-br"></div>

            <div className="relative w-full overflow-hidden flex items-center justify-center bg-brand-void">
              <Image
                src={settings.bannerUrl || "/assets/brand/banner.jpeg"}
                alt="Shadow Byte Syndicate official horizontal brand banner showcasing the SB shield, hooded cyber defense figure, and core mottos"
                width={1600}
                height={639}
                priority
                unoptimized
                className="w-full h-auto object-contain block max-h-[420px]"
              />
            </div>
          </div>

          {/* Dedicated Mobile Responsive Identity Card */}
          <div className="sm:hidden cyber-panel p-6 rounded-lg border border-brand-border mb-6 text-center relative">
            <div className="corner-bracket-tl"></div>
            <div className="corner-bracket-tr"></div>
            <div className="corner-bracket-bl"></div>
            <div className="corner-bracket-br"></div>

            <div className="mx-auto w-24 h-24 mb-4 rounded-full border-2 border-brand-red/60 overflow-hidden bg-brand-black p-1 shadow-red-glow">
              <Image
                src={settings.shieldLogoUrl || "/assets/brand/shield-emblem.png"}
                alt="Shadow Byte Syndicate SB Shield"
                width={96}
                height={96}
                unoptimized
                className="object-cover w-full h-full"
              />
            </div>

            <div className="text-2xl font-black tracking-wider text-white mb-1">
              SHADOW BYTE
            </div>
            <div className="text-sm font-mono text-brand-red font-bold tracking-widest uppercase mb-3">
              SYNDICATE
            </div>
            <div className="text-xs font-mono text-brand-gray-dim tracking-wider uppercase mb-4">
              {settings.supportingLine}
            </div>
            <div className="p-2.5 bg-brand-black/80 border border-brand-border rounded text-xs font-mono text-brand-gray-text italic">
              &ldquo;{settings.mainTagline}&rdquo;
            </div>
          </div>

          {/* Welcome Eyebrow, Main Heading, Intro Summary & Action CTAs */}
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-[11px] font-mono text-brand-redBright uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5" />
              <span>WELCOME TO SHADOW BYTE SYNDICATE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Collegiate Cybersecurity Research, Threat Defense &amp; Ethical Hacking
            </h1>

            <p className="text-sm sm:text-base text-brand-gray-text leading-relaxed font-sans">
              {settings.aboutSummary}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link
                href="/events"
                className="px-5 py-2.5 bg-brand-red hover:bg-brand-redBright text-white text-xs sm:text-sm font-mono font-bold rounded border border-brand-redBright/50 shadow-red-glow transition-all flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>EXPLORE EVENTS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/about"
                className="px-5 py-2.5 bg-brand-surface hover:bg-brand-card text-white text-xs sm:text-sm font-mono font-medium rounded border border-brand-border hover:border-brand-red/60 transition-all flex items-center space-x-2"
              >
                <Shield className="w-4 h-4 text-brand-red" />
                <span>ABOUT THE SYNDICATE</span>
              </Link>

              <Link
                href="/login/student"
                className="px-5 py-2.5 bg-brand-card hover:bg-brand-surface text-brand-gray-light text-xs sm:text-sm font-mono font-medium rounded border border-brand-border hover:border-brand-red/60 transition-all flex items-center space-x-2"
              >
                <Terminal className="w-4 h-4 text-brand-red" />
                <span>STUDENT LOGIN</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
