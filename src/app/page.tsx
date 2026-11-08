import React from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { BRAND, PUBLISH_STATUS } from "@/lib/constants";
import {
  Shield,
  Terminal,
  Calendar,
  BookOpen,
  ArrowRight,
  Target,
  Search,
  Lock,
  Cpu,
  Award,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export const revalidate = 60; // Refresh dynamic sections periodically

async function getHomePageData() {
  const [settings, upcomingEvents, latestPosts, teamMembers] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.event.findMany({
      where: {
        status: PUBLISH_STATUS.PUBLISHED,
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 3,
      include: {
        _count: {
          select: { registrations: { where: { status: "CONFIRMED" } } },
        },
      },
    }),
    prisma.post.findMany({
      where: { status: PUBLISH_STATUS.PUBLISHED },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        createdBy: { select: { name: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      take: 4,
    }),
  ]);

  return {
    settings: settings || {
      clubName: BRAND.name,
      supportingLine: BRAND.supportingLine,
      mainTagline: BRAND.mainTagline,
      secondaryPhrase: BRAND.secondaryPhrase,
      aboutSummary:
        "Shadow Byte Syndicate is an elite student-led collegiate cybersecurity defense collective dedicated to hands-on security research, CTF competitions, threat intelligence, and digital defense.",
      bannerUrl: "/assets/brand/banner.jpeg",
      shieldLogoUrl: "/assets/brand/shield-emblem.png",
    },
    upcomingEvents,
    latestPosts,
    teamMembers,
  };
}

export default async function HomePage() {
  const { settings, upcomingEvents, latestPosts, teamMembers } = await getHomePageData();

  const coreActivities = [
    {
      icon: Target,
      title: "CTF Competitions",
      desc: "Weekly Jeopardy and Attack-Defense challenges tackling binary exploitation, reverse engineering, web pwn, and cryptography.",
    },
    {
      icon: Terminal,
      title: "Hands-on Workshops",
      desc: "Deep-dive technical sessions mastering Burp Suite, Ghidra, Wireshark, Metasploit, and secure code architecture.",
    },
    {
      icon: Lock,
      title: "Ethical Hacking & Labs",
      desc: "Sanctioned sandbox lab environments designed to dissect real-world CVEs and defensive countermeasures safely.",
    },
    {
      icon: Search,
      title: "Security Research",
      desc: "Student vulnerability research, responsible disclosure case studies, and kernel/browser security exploration.",
    },
    {
      icon: Cpu,
      title: "Digital Forensics & IR",
      desc: "Memory dump analysis, live system triage, network packet forensics, and incident response automation.",
    },
    {
      icon: Award,
      title: "Cyber Defense & Awareness",
      desc: "Mentoring undergraduate engineers, fostering cyber hygiene, and cultivating defensive security engineering skills.",
    },
  ];

  return (
    <div className="relative">
      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION WITH OFFICIAL BRAND BANNER */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-6 pb-16 lg:py-20 border-b border-brand-border/60 overflow-hidden bg-cyber-grid">
        {/* Subtle radial red glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-redDark/15 blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Terminal initialization status line */}
          <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between text-[11px] font-mono text-brand-gray-dim bg-brand-card/80 border border-brand-border px-3 py-1.5 rounded">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-brand-gray-text font-bold">&gt;&gt; SECURE SYSTEM TERMINAL</span>
            </div>
            <div className="text-brand-redBright hidden sm:block">STATUS: AUTHORIZED // ACCESS GRANTED</div>
          </div>

          {/* Desktop/Tablet Official Artwork Viewport Frame */}
          <div className="hidden sm:block relative rounded-lg border-2 border-brand-border/80 overflow-hidden bg-brand-card shadow-red-glow mb-10 group transition-all hover:border-brand-red/60">
            {/* Tech Corner Brackets */}
            <div className="corner-bracket-tl"></div>
            <div className="corner-bracket-tr"></div>
            <div className="corner-bracket-bl"></div>
            <div className="corner-bracket-br"></div>

            <div className="relative w-full aspect-[1600/639] max-h-[500px]">
              <Image
                src={settings.bannerUrl || "/assets/brand/banner.jpeg"}
                alt="Shadow Byte Syndicate official horizontal brand banner showcasing the SB shield, hooded cyber defense figure, and core mottos"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </div>

          {/* Dedicated Mobile Responsive Identity Card */}
          {/* (Avoids shrinking the wide banner into unreadable microtext on narrow screens per prompt requirement 1) */}
          <div className="sm:hidden cyber-panel p-6 rounded-lg border border-brand-border mb-8 text-center relative">
            <div className="corner-bracket-tl"></div>
            <div className="corner-bracket-tr"></div>
            <div className="corner-bracket-bl"></div>
            <div className="corner-bracket-br"></div>

            <div className="mx-auto w-24 h-24 mb-4 rounded-full border-2 border-brand-red/60 overflow-hidden bg-brand-black p-1 shadow-red-glow">
              <Image
                src="/assets/brand/shield-emblem.png"
                alt="Shadow Byte Syndicate SB Shield"
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>

            <h1 className="text-2xl font-black tracking-wider text-white mb-1">
              SHADOW BYTE
            </h1>
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

          {/* Accessible HTML Headings, Intro & Action CTAs */}
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Collegiate Cybersecurity Research, Threat Defense & Ethical Hacking
            </h2>

            <p className="text-sm sm:text-base text-brand-gray-text leading-relaxed font-sans">
              {settings.aboutSummary}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/events"
                className="px-6 py-3 bg-brand-red hover:bg-brand-redBright text-white text-sm font-mono font-bold rounded border border-brand-redBright/50 shadow-red-glow transition-all flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>EXPLORE EVENTS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login/student"
                className="px-6 py-3 bg-brand-card hover:bg-brand-surface text-brand-gray-light text-sm font-mono font-medium rounded border border-brand-border hover:border-brand-red/60 transition-all flex items-center space-x-2"
              >
                <Terminal className="w-4 h-4 text-brand-red" />
                <span>STUDENT PORTAL LOGIN</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 2. MISSION & CORE PILLARS */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-brand-dark/40 border-b border-brand-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>DEFENSIVE CAPABILITIES</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Syndicate Operational Pillars
            </h3>
            <p className="text-sm text-brand-gray-muted mt-2">
              Bridging academic computer science theory with hands-on industrial cyber defense practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreActivities.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div
                  key={idx}
                  className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all group relative"
                >
                  <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="w-10 h-10 rounded bg-brand-surface border border-brand-border flex items-center justify-center mb-4 group-hover:border-brand-red group-hover:shadow-red-glow-sm transition-all">
                    <Icon className="w-5 h-5 text-brand-red group-hover:text-brand-redBright transition-colors" />
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors">
                    {act.title}
                  </h4>
                  <p className="text-xs text-brand-gray-muted leading-relaxed font-sans">
                    {act.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. UPCOMING EVENTS PREVIEW */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 border-b border-brand-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>SCHEDULED ENGAGEMENTS</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Upcoming Workshops & CTFs
              </h3>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-brand-red hover:text-brand-redBright font-semibold group"
            >
              <span>VIEW FULL SCHEDULE</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-12 text-center cyber-panel rounded-lg border border-brand-border">
              <Calendar className="w-12 h-12 text-brand-gray-dim mx-auto mb-3" />
              <p className="text-sm font-mono text-brand-gray-text">
                No upcoming public sessions currently scheduled.
              </p>
              <p className="text-xs text-brand-gray-muted mt-1">
                Check back shortly or view our past event archives.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((evt) => {
                const confirmed = evt._count.registrations;
                const seatsLeft = Math.max(0, evt.capacity - confirmed);
                const isFull = seatsLeft === 0;

                return (
                  <div
                    key={evt.id}
                    className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-brand-gray-dim mb-3">
                        <span className="px-2 py-0.5 rounded bg-brand-surface text-brand-redBright border border-brand-border">
                          {evt.category}
                        </span>
                        <span>{evt.mode.replace("_", " ")}</span>
                      </div>

                      <h4 className="text-lg font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors line-clamp-2">
                        {evt.title}
                      </h4>

                      <p className="text-xs text-brand-gray-muted line-clamp-3 mb-4 leading-relaxed">
                        {evt.summary}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-brand-border/60 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-brand-gray-dim">
                        <span>{new Date(evt.startDate).toLocaleDateString()}</span>
                        <span className={isFull ? "text-brand-red" : "text-emerald-400"}>
                          {isFull ? "CAPACITY FULL" : `${seatsLeft} SEATS LEFT`}
                        </span>
                      </div>

                      <Link
                        href={`/events/${evt.slug}`}
                        className="w-full py-2 bg-brand-surface hover:bg-brand-redDark/40 border border-brand-border hover:border-brand-red text-center rounded text-xs font-mono font-semibold text-white block transition-all"
                      >
                        VIEW DETAILS & REGISTER
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. KNOWLEDGE HUB / LATEST POSTS */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-brand-dark/30 border-b border-brand-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>RESEARCH & DISCLOSURE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Knowledge Hub & Articles
              </h3>
            </div>
            <Link
              href="/posts"
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-brand-red hover:text-brand-redBright font-semibold group"
            >
              <span>BROWSE ALL ARTICLES</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestPosts.map((post) => (
              <article
                key={post.id}
                className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="text-[11px] font-mono text-brand-redBright mb-2">
                    // {post.category.toUpperCase()}
                  </div>
                  <h4 className="text-base font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-xs text-brand-gray-muted line-clamp-3 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between text-[11px] font-mono text-brand-gray-dim">
                  <span>By {post.createdBy.name}</span>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="text-brand-red hover:text-brand-redBright font-semibold"
                  >
                    READ ARTICLE &gt;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. CORE TEAM PREVIEW */}
      {/* ---------------------------------------------------- */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>LEADERSHIP</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Syndicate Core Team
            </h3>
            <p className="text-sm text-brand-gray-muted mt-2">
              Faculty guidance and student leadership steering technical research and operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="cyber-panel p-5 rounded-lg border border-brand-border text-center hover:border-brand-red/60 transition-all"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-brand-card border border-brand-red/40 flex items-center justify-center mb-4 overflow-hidden shadow-red-glow-sm">
                  {member.photoUrl ? (
                    <Image
                      src={member.photoUrl}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Shield className="w-8 h-8 text-brand-red" />
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mb-0.5">{member.name}</h4>
                <div className="text-[11px] font-mono text-brand-red font-semibold mb-2">
                  {member.role}
                </div>
                <p className="text-xs text-brand-gray-muted line-clamp-3 leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/team"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-surface border border-brand-border hover:border-brand-red text-white text-xs font-mono font-semibold rounded transition-all"
            >
              <span>MEET ALL COMMITTEE MEMBERS & FACULTY</span>
              <ArrowRight className="w-4 h-4 text-brand-red" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
