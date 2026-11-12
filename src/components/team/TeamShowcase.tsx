import React from "react";
import { Users, Shield, Award, Briefcase, Palette, Camera } from "lucide-react";
import CircularAvatar from "./CircularAvatar";
import {
  INSTITUTIONAL_LEADERSHIP,
  FACULTY_COORDINATION,
  TECH_TEAM,
  MANAGEMENT_TEAM,
  DESIGN_TEAM,
  VIDEO_PHOTO_TEAM,
  LeadershipTeamMember,
  TeamMemberProfile,
} from "@/data/teamMembers";

function LeadershipProfileCard({
  member,
  testId,
}: {
  member: LeadershipTeamMember;
  testId: string;
}) {
  return (
    <article
      data-testid={testId}
      className="cyber-panel rounded-xl border border-brand-border/90 hover:border-brand-red/70 hover:shadow-red-glow hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col items-center text-center group relative overflow-hidden"
    >
      {/* Subtle top red hairline distinguishing Leadership & Faculty tier */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-80" />
      <div className="corner-bracket-tl opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="corner-bracket-br opacity-70 group-hover:opacity-100 transition-opacity" />

      <div className="p-1.5 rounded-full bg-gradient-to-b from-brand-red/35 via-brand-border to-transparent">
        <CircularAvatar
          src={member.imagePath}
          alt={member.name}
          size="xl"
          variant="leadership"
        />
      </div>

      <h3 className="mt-6 text-xl font-bold text-white tracking-tight group-hover:text-brand-redBright transition-colors">
        {member.name}
      </h3>

      <span className="mt-2.5 inline-flex items-center px-3.5 py-1 rounded-full text-xs font-mono font-semibold tracking-wide bg-brand-redDark/25 border border-brand-red/40 text-brand-redBright">
        {member.designation}
      </span>
    </article>
  );
}

function MemberProfileCard({
  member,
  testIdPrefix,
}: {
  member: TeamMemberProfile;
  testIdPrefix: string;
}) {
  return (
    <article
      data-testid={`${testIdPrefix}-${member.id}`}
      className="w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)] cyber-panel rounded-xl border border-brand-border hover:border-brand-red/60 hover:shadow-red-glow-sm hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col items-center justify-center text-center group relative"
    >
      <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-1 rounded-full bg-brand-black/70 border border-brand-border/80 group-hover:border-brand-red/50 transition-colors">
        <CircularAvatar
          src={member.imagePath}
          alt={member.name}
          size="lg"
          variant="member"
        />
      </div>

      <h3 className="mt-5 text-base font-bold text-white tracking-tight group-hover:text-brand-redBright transition-colors">
        {member.name}
      </h3>
    </article>
  );
}

interface TeamSectionBlockProps {
  headingId: string;
  sectionTag: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  members: readonly TeamMemberProfile[];
  testIdPrefix: string;
}

function TeamSectionBlock({
  headingId,
  sectionTag,
  title,
  icon: Icon,
  members,
  testIdPrefix,
}: TeamSectionBlockProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-8">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="inline-flex items-center space-x-2 text-xs font-mono text-brand-red uppercase tracking-widest">
          <Icon className="w-3.5 h-3.5" />
          <span>{sectionTag}</span>
        </div>
        <h2
          id={headingId}
          className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
        >
          {title}
        </h2>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-brand-red to-transparent" />
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {members.map((member) => (
          <MemberProfileCard
            key={member.id}
            member={member}
            testIdPrefix={testIdPrefix}
          />
        ))}
      </div>
    </section>
  );
}

export default function TeamShowcase() {
  return (
    <div className="space-y-20">
      {/* Page Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
          <Users className="w-3.5 h-3.5" />
          <span>SYNDICATE DIRECTORY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Leadership &amp; Syndicate Teams
        </h1>
        <p className="text-sm sm:text-base text-brand-gray-muted max-w-2xl mx-auto font-sans leading-relaxed">
          Institutional mentors, faculty guidance, and the student teams advancing cybersecurity research, operations, design, and media.
        </p>
      </div>

      {/* 1. INSTITUTIONAL LEADERSHIP */}
      <section aria-labelledby="institutional-leadership-heading" className="space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-brand-red uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" />
            <span>01 // INSTITUTIONAL LEADERSHIP</span>
          </div>
          <h2
            id="institutional-leadership-heading"
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
          >
            Institutional Leadership
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-brand-red to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {INSTITUTIONAL_LEADERSHIP.map((leader) => (
            <LeadershipProfileCard
              key={leader.id}
              member={leader}
              testId={`leadership-${leader.id}`}
            />
          ))}
        </div>
      </section>

      {/* 2. FACULTY COORDINATION */}
      <section aria-labelledby="faculty-coordination-heading" className="space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-brand-red uppercase tracking-widest">
            <Award className="w-3.5 h-3.5" />
            <span>02 // FACULTY COORDINATION</span>
          </div>
          <h2
            id="faculty-coordination-heading"
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
          >
            Faculty Coordination
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-brand-red to-transparent" />
        </div>

        <div className="max-w-md mx-auto">
          {FACULTY_COORDINATION.map((faculty) => (
            <LeadershipProfileCard
              key={faculty.id}
              member={faculty}
              testId={`faculty-${faculty.id}`}
            />
          ))}
        </div>
      </section>

      {/* 3. TECH TEAM */}
      <TeamSectionBlock
        headingId="tech-team-heading"
        sectionTag="03 // TECH TEAM"
        title="Tech Team"
        icon={Users}
        members={TECH_TEAM}
        testIdPrefix="tech-member"
      />

      {/* 4. MANAGEMENT TEAM */}
      <TeamSectionBlock
        headingId="management-team-heading"
        sectionTag="04 // MANAGEMENT TEAM"
        title="Management Team"
        icon={Briefcase}
        members={MANAGEMENT_TEAM}
        testIdPrefix="management-member"
      />

      {/* 5. DESIGN TEAM */}
      <TeamSectionBlock
        headingId="design-team-heading"
        sectionTag="05 // DESIGN TEAM"
        title="Design Team"
        icon={Palette}
        members={DESIGN_TEAM}
        testIdPrefix="design-member"
      />

      {/* 6. VIDEO & PHOTO TEAM */}
      <TeamSectionBlock
        headingId="video-photo-team-heading"
        sectionTag="06 // VIDEO & PHOTO TEAM"
        title="Video & Photo Team"
        icon={Camera}
        members={VIDEO_PHOTO_TEAM}
        testIdPrefix="video-photo-member"
      />
    </div>
  );
}

