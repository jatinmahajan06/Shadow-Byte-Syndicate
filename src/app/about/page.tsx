import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getSiteSettings, getTeamMembers, getGalleryItems } from "@/services/siteService";
import {
  Shield,
  Lock,
  CheckCircle2,
  Users,
  HelpCircle,
  ArrowRight,
  Target,
  Terminal,
  Search,
  Cpu,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About",
  description: "Mission, vision, operational pillars, ethical cybersecurity charter, and leadership of Shadow Byte Syndicate.",
};

export default async function AboutPage() {
  const [settings, facultyMembers, galleryItems] = await Promise.all([
    getSiteSettings(),
    getTeamMembers({ category: "FACULTY", onlyActive: true }),
    getGalleryItems(),
  ]);

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

  const faqs = [
      {
        q: "Who can join Shadow Byte Syndicate?",
        a: "Any enrolled collegiate student interested in computer systems, networking, application security, or CTF competitions. All experience levels—from absolute beginners to seasoned CTF players—are welcome.",
      },
      {
        q: "Does Shadow Byte Syndicate engage in unauthorized penetration testing?",
        a: "Strictly NO. Shadow Byte Syndicate operates under a zero-tolerance policy against unauthorized network penetration, malicious disruption, or illegal computing activities. All technical demonstrations, labs, and exercises take place in strictly isolated, sandboxed networks or legally authorized educational CTF arenas.",
      },
      {
        q: "What is your Responsible Vulnerability Disclosure policy?",
        a: "When members identify vulnerabilities in open-source libraries or sanctioned testbeds, we coordinate with maintainers and security teams following industry-standard 90-day coordinated disclosure timelines, prioritizing patches before public technical write-ups.",
      },
      {
        q: "Are workshops and events free for students?",
        a: "Yes. All club workshops, CTF training, and educational sessions are completely free for registered students.",
      },
      {
        q: "How do I participate in upcoming workshops and CTFs?",
        a: "Simply sign up for a Student Account on this portal, navigate to the Events page, and click 'Register' on any open event.",
      },
    ];

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>ORGANIZATIONAL PROFILE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            About Shadow Byte Syndicate
          </h1>
          <p className="text-sm sm:text-base text-brand-gray-text leading-relaxed font-sans">
            {settings?.aboutSummary ||
              "An elite student-led cybersecurity collective engineering the next generation of defensive security architects and threat researchers."}
          </p>
        </div>

        {/* Mission, Vision, and Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="cyber-panel p-6 rounded-lg border border-brand-border relative">
            <div className="corner-bracket-tl"></div>
            <div className="text-brand-red font-mono text-xs font-bold uppercase tracking-widest mb-2">
              // 01. OUR MISSION
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Defensive Mastery</h3>
            <p className="text-xs text-brand-gray-muted leading-relaxed">
              To cultivate practical, battle-tested cybersecurity engineering skills through hands-on experimentation, competitive CTF training, and defensive system hardening.
            </p>
          </div>

          <div className="cyber-panel p-6 rounded-lg border border-brand-border relative">
            <div className="corner-bracket-tl"></div>
            <div className="text-brand-red font-mono text-xs font-bold uppercase tracking-widest mb-2">
              // 02. OUR VISION
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Beyond Firewalls</h3>
            <p className="text-xs text-brand-gray-muted leading-relaxed">
              To foster an ethical cybersecurity culture where security is not treated as a perimeter afterthought, but baked into fundamental architectural design principles.
            </p>
          </div>

          <div className="cyber-panel p-6 rounded-lg border border-brand-border relative">
            <div className="corner-bracket-tl"></div>
            <div className="text-brand-red font-mono text-xs font-bold uppercase tracking-widest mb-2">
              // 03. CORE VALUES
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Ethics & Transparency</h3>
            <p className="text-xs text-brand-gray-muted leading-relaxed">
              Integrity, strict adherence to ethical disclosure protocols, collaborative learning, and zero tolerance for unauthorized or destructive exploitation.
            </p>
          </div>
        </div>

        {/* Syndicate Operational Pillars */}
        <div className="space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              DEFENSIVE CAPABILITIES
            </span>
            <h2 className="text-2xl font-bold text-white">Syndicate Operational Pillars</h2>
            <p className="text-xs sm:text-sm text-brand-gray-muted mt-1">
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

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors">
                    {act.title}
                  </h3>
                  <p className="text-xs text-brand-gray-muted leading-relaxed font-sans">
                    {act.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ethical Cybersecurity & Responsible Disclosure Statement */}
        <div id="ethics" className="cyber-panel p-8 rounded-lg border border-brand-red/40 relative bg-brand-black/90">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded bg-brand-redDark/40 border border-brand-red text-brand-redBright">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Ethical Cybersecurity & Responsible Disclosure Charter
              </h2>
              <span className="text-xs font-mono text-brand-red uppercase tracking-wider">
                MANDATORY CODE OF ETHICS FOR ALL SYNDICATE MEMBERS
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-brand-gray-text leading-relaxed font-sans">
            <p>
              {settings?.ethicsStatement ||
                "Shadow Byte Syndicate is committed to defensive security research, ethical vulnerability disclosure, and academic rigor."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-brand-surface/60 rounded border border-brand-border flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-xs mb-1">Sanctioned Research Only</h4>
                  <p className="text-xs text-brand-gray-muted">
                    Penetration tests and exploit analyses are conducted strictly within sandboxed club laboratories or explicitly authorized CTF platforms.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-brand-surface/60 rounded border border-brand-border flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-xs mb-1">Coordinated Disclosure</h4>
                  <p className="text-xs text-brand-gray-muted">
                    Any zero-day or N-day vulnerability discovered in open software is reported privately to vendors before public educational discussion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Coordinator Section */}
        <div className="space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              ACADEMIC ADVISORY
            </span>
            <h3 className="text-2xl font-bold text-white">Faculty Coordinator & Mentorship</h3>
          </div>

          {facultyMembers.length === 0 ? (
            <div className="p-6 cyber-panel rounded-lg border border-brand-border text-center">
              <p className="text-xs font-mono text-brand-gray-dim">
                No faculty advisor profiles added yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {facultyMembers.map((fac) => (
                <div
                  key={fac.id}
                  className="cyber-panel p-6 rounded-lg border border-brand-border flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5"
                >
                  <div className="w-20 h-20 rounded-full bg-brand-card border border-brand-red/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {fac.photoUrl ? (
                      <Image
                        src={fac.photoUrl}
                        alt={fac.name}
                        width={80}
                        height={80}
                        unoptimized
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-brand-red" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{fac.name}</h4>
                    <div className="text-xs font-mono text-brand-red font-semibold mb-2">
                      {fac.role}
                    </div>
                    <p className="text-xs text-brand-gray-muted leading-relaxed mb-3">
                      {fac.bio}
                    </p>
                    {fac.email && (
                      <span className="text-xs font-mono text-brand-gray-dim">
                        Contact: {fac.email}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frequently Asked Questions (FAQs) */}
        <div className="space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              COMMONLY ASKED
            </span>
            <h3 className="text-2xl font-bold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="cyber-panel p-5 rounded-lg border border-brand-border"
              >
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-brand-red flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">{faq.q}</h4>
                    <p className="text-xs text-brand-gray-text leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Gallery Highlights (when populated in Firestore) */}
        {galleryItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-l-2 border-brand-red pl-3">
              <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
                FIELD ARCHIVES
              </span>
              <h3 className="text-2xl font-bold text-white">Club Activity Gallery</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="cyber-panel rounded-lg border border-brand-border overflow-hidden group hover:border-brand-red/60 transition-all"
                >
                  <div className="relative w-full h-48 bg-brand-void overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    {item.eventTag && (
                      <span className="text-[10px] font-mono text-brand-redBright uppercase tracking-wider">
                        {item.eventTag}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    {item.caption && (
                      <p className="text-xs text-brand-gray-muted line-clamp-2">{item.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center p-10 cyber-panel rounded-lg border border-brand-border space-y-4">
          <h3 className="text-xl font-bold text-white">Ready to Secure the System?</h3>
          <p className="text-xs text-brand-gray-muted max-w-xl mx-auto">
            Create your student account today to gain access to upcoming technical workshops, CTF competition teams, and research sessions.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-red hover:bg-brand-redBright text-white text-xs font-mono font-bold rounded shadow-red-glow transition-all"
            >
              <span>REGISTER AS A STUDENT MEMBER</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center space-x-2 px-5 py-3 bg-brand-surface hover:bg-brand-card border border-brand-border hover:border-brand-red/60 text-white text-xs font-mono font-semibold rounded transition-all"
            >
              <span>VIEW UPCOMING EVENTS</span>
            </Link>
            <Link
              href="/team"
              className="inline-flex items-center space-x-2 px-5 py-3 bg-brand-surface hover:bg-brand-card border border-brand-border hover:border-brand-red/60 text-white text-xs font-mono font-semibold rounded transition-all"
            >
              <span>MEET THE TEAM</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

