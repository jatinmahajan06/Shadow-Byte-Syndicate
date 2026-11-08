import React from "react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Users, Shield, Github, Linkedin, Mail } from "lucide-react";

export const metadata = {
  title: "Team & Leadership",
  description: "Meet the faculty coordinator and student leaders of Shadow Byte Syndicate.",
};

export default async function TeamPage() {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const faculty = members.filter((m) => m.category === "FACULTY");
  const coreTeam = members.filter((m) => m.category !== "FACULTY");

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>SYNDICATE PERSONNEL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Club Leadership & Advisors
          </h1>
          <p className="text-sm text-brand-gray-muted max-w-2xl mx-auto font-sans">
            Guiding cybersecurity education, mentoring competition squads, and advancing systems defense research.
          </p>
        </div>

        {/* Faculty Advisor Section */}
        {faculty.length > 0 && (
          <div className="space-y-6">
            <div className="border-l-2 border-brand-red pl-3">
              <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
                FACULTY MENTORSHIP
              </span>
              <h2 className="text-2xl font-bold text-white">Academic Coordinators</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faculty.map((member) => (
                <div
                  key={member.id}
                  className="cyber-panel p-6 rounded-lg border border-brand-border flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5"
                >
                  <div className="w-24 h-24 rounded-full bg-brand-card border-2 border-brand-red/40 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-red-glow-sm">
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt={member.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Shield className="w-10 h-10 text-brand-red" />
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-bold text-white">{member.name}</h3>
                    <div className="text-xs font-mono text-brand-red font-semibold mb-2">
                      {member.role}
                    </div>
                    <p className="text-xs text-brand-gray-muted leading-relaxed mb-4">
                      {member.bio}
                    </p>

                    <div className="flex items-center justify-center sm:justify-start space-x-3 text-xs font-mono text-brand-gray-dim">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="hover:text-brand-redBright flex items-center space-x-1"
                        >
                          <Mail className="w-3.5 h-3.5 text-brand-red" />
                          <span>{member.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Committee & Leads */}
        <div className="space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              STUDENT LEADERSHIP
            </span>
            <h2 className="text-2xl font-bold text-white">Core Committee & Researchers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreTeam.map((member) => (
              <div
                key={member.id}
                className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group relative"
              >
                <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="text-center">
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

                  <h3 className="text-base font-bold text-white mb-0.5">{member.name}</h3>
                  <div className="text-xs font-mono text-brand-red font-semibold mb-3">
                    {member.role}
                  </div>
                  <p className="text-xs text-brand-gray-muted leading-relaxed line-clamp-4">
                    {member.bio}
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-brand-border/60 flex items-center justify-center space-x-3 text-brand-gray-dim">
                  {member.githubUrl && (
                    <a
                      href={member.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                      aria-label="GitHub Profile"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {member.linkedinUrl && (
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                      aria-label="LinkedIn Profile"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="hover:text-white transition-colors"
                      aria-label="Email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
