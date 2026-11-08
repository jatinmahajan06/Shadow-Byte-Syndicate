import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { ROLES, PUBLISH_STATUS, EVENT_MODES } from "../src/lib/constants";

async function seed() {
  console.log("--- SEEDING FICTIONAL DEVELOPMENT DATA ---");

  // 1. Site Settings
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      clubName: "SHADOW BYTE SYNDICATE",
      supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
      mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.",
      secondaryPhrase: "BEYOND FIREWALLS",
      contactEmail: "contact@shadowbyte.club",
      timezone: "Asia/Kolkata",
      instagramHandle: "@shadowbyte.syndicate",
      youtubeChannel: "Shadow Byte Syndicate",
      discordInvite: "discord.gg/shadowbyte",
      bannerUrl: "/assets/brand/banner.jpeg",
      shieldLogoUrl: "/assets/brand/shield-emblem.png",
      aboutSummary:
        "Shadow Byte Syndicate is an elite student-led collegiate cybersecurity defense collective dedicated to hands-on security research, CTF competitions, threat intelligence, and digital defense.",
      ethicsStatement:
        "Shadow Byte Syndicate operates under strict ethical guidelines. All penetration testing and offensive techniques are practiced strictly in authorized sandboxed labs and sanctioned environments. We prioritize defensive security and responsible disclosure.",
    },
    update: {},
  });

  // 2. Development accounts
  const superAdminHash = await hashPassword("AdminDevPass123!");
  const coordHash = await hashPassword("CoordDevPass123!");
  const studentHash = await hashPassword("StudentDevPass123!");

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@shadowbyte.local" },
    create: {
      email: "admin@shadowbyte.local",
      passwordHash: superAdminHash,
      name: "Super Admin [Dev Fixture]",
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      department: "Cybersecurity Administration",
    },
    update: {
      role: ROLES.SUPER_ADMIN,
      isActive: true,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: "coordinator@shadowbyte.local" },
    create: {
      email: "coordinator@shadowbyte.local",
      passwordHash: coordHash,
      name: "Coordinator [Dev Fixture]",
      role: ROLES.COORDINATOR,
      isActive: true,
      department: "Computer Science & Engineering",
    },
    update: {
      role: ROLES.COORDINATOR,
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@shadowbyte.local" },
    create: {
      email: "student@shadowbyte.local",
      passwordHash: studentHash,
      name: "Alex Vance [Dev Student]",
      role: ROLES.STUDENT,
      isActive: true,
      studentId: "CS2026-089",
      department: "Information Technology",
    },
    update: {
      role: ROLES.STUDENT,
      isActive: true,
    },
  });

  // 3. Fictional Events
  const now = new Date();
  const futureEvent1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureEvent1End = new Date(futureEvent1.getTime() + 4 * 60 * 60 * 1000);
  const futureDeadline1 = new Date(futureEvent1.getTime() - 24 * 60 * 60 * 1000);

  const futureEvent2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const futureEvent2End = new Date(futureEvent2.getTime() + 8 * 60 * 60 * 1000);
  const futureDeadline2 = new Date(futureEvent2.getTime() - 24 * 60 * 60 * 1000);

  const pastEvent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastEventEnd = new Date(pastEvent.getTime() + 3 * 60 * 60 * 1000);

  await prisma.event.upsert({
    where: { slug: "web-pentesting-zero-to-hero" },
    create: {
      slug: "web-pentesting-zero-to-hero",
      title: "Hands-on Web Application Pentesting: OWASP Top 10",
      summary:
        "Comprehensive hands-on laboratory session dissecting real-world vulnerabilities including SQLi, SSRF, IDOR, and broken access controls.",
      description: `### Overview
Join Shadow Byte Syndicate for an intensive 4-hour hands-on technical workshop exploring offensive and defensive web application security.

### Topics Covered
- **Authentication & Authorization**: Bypassing flawed JWT implementations and IDOR vulnerability discovery.
- **Injection Attacks**: Modern SQL Injection extraction techniques and blind timing attacks.
- **Server-Side Request Forgery (SSRF)**: Pivot from internal cloud metadata services to local network probing.
- **Defense & Remediation**: Hardening application codebases, implementing parameterized queries, and rigorous access control lists.

### Prerequisites
- Basic familiarity with HTTP protocols, web development, and browser developer tools.
- Laptop with Burp Suite Community Edition installed.`,
      mode: EVENT_MODES.IN_PERSON,
      venue: "Computer Systems Lab 4B (Main Campus)",
      startDate: futureEvent1,
      endDate: futureEvent1End,
      registrationDeadline: futureDeadline1,
      capacity: 40,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "Workshop",
      createdById: superAdmin.id,
    },
    update: {},
  });

  await prisma.event.upsert({
    where: { slug: "syndicate-ctf-winter-2026" },
    create: {
      slug: "syndicate-ctf-winter-2026",
      title: "Shadow Byte Syndicate Winter Invitational CTF",
      summary:
        "Collegiate Jeopardy-style Capture The Flag competition featuring binary exploitation, cryptography, reverse engineering, and web challenges.",
      description: `### Competition Format
The Winter Invitational CTF is an individual and team-based Jeopardy-style tournament open to all registered collegiate students.

### Categories
1. **Web Exploitation**: Modern web services, GraphQL manipulation, and prototype pollution.
2. **Reverse Engineering**: x86-64 binary disassembly, decompilation, and anti-debugging analysis.
3. **Cryptography**: RSA key degradation, side-channel leakages, and custom cipher cryptanalysis.
4. **Digital Forensics**: Memory dump inspection using Volatility and network pcap analysis.

Certificates of excellence and technical merit badges will be awarded to top finishers.`,
      mode: EVENT_MODES.HYBRID,
      venue: "Auditorium Hall C & Discord Cyber Arena",
      startDate: futureEvent2,
      endDate: futureEvent2End,
      registrationDeadline: futureDeadline2,
      capacity: 100,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "CTF Competition",
      createdById: coordinator.id,
    },
    update: {},
  });

  await prisma.event.upsert({
    where: { slug: "intro-reverse-engineering-past" },
    create: {
      slug: "intro-reverse-engineering-past",
      title: "Foundations of Reverse Engineering: Ghidra & x86 Assembly",
      summary:
        "Archive of our introductory reverse engineering workshop focusing on static disassembly and control flow analysis.",
      description:
        "Completed technical session on reverse engineering compiled binaries with Ghidra and IDA Free.",
      mode: EVENT_MODES.IN_PERSON,
      venue: "Cyber Defense Lab 2A",
      startDate: pastEvent,
      endDate: pastEventEnd,
      registrationDeadline: new Date(pastEvent.getTime() - 48 * 60 * 60 * 1000),
      capacity: 35,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: false,
      category: "Workshop",
      createdById: superAdmin.id,
    },
    update: {},
  });

  // 4. Sample Posts / Knowledge Hub
  await prisma.post.upsert({
    where: { slug: "demystifying-prototype-pollution" },
    create: {
      slug: "demystifying-prototype-pollution",
      title: "Demystifying Client & Server-Side Prototype Pollution in JavaScript",
      excerpt:
        "A deep technical breakdown of Object.prototype manipulation, recursive merge hazards, and gadget chain execution in modern Node.js backends.",
      content: `## What is Prototype Pollution?
JavaScript is a prototype-based object-oriented language. Every object inherits properties from its prototype chain, terminating at \`Object.prototype\`. 

When an application recursively merges or assigns properties from untrusted user JSON into existing objects without validating property keys like \`__proto__\`, \`constructor\`, or \`prototype\`, an attacker can inject malicious properties globally across all runtime objects.

\`\`\`javascript
// Vulnerable recursive merge pattern
function deepMerge(target, source) {
  for (let key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
\`\`\`

## Exploitation Scenarios
1. **Denial of Service (DoS)**: Overwriting \`toString\` or built-in methods causing server crashes.
2. **Remote Code Execution (RCE)**: Polluting options passed to \`child_process.fork\` or templating engines.
3. **Authentication Bypass**: Injected \`isAdmin: true\` into default prototypes.

## Remediation & Hardening
- Use \`Object.create(null)\` for dictionary objects to eliminate the prototype chain.
- Validate and discard dangerous keys: \`['__proto__', 'constructor', 'prototype']\`.
- Leverage \`Object.freeze(Object.prototype)\` during application bootstrap.`,
      category: "Security Research",
      tags: "web-security, javascript, vulnerability-analysis",
      status: PUBLISH_STATUS.PUBLISHED,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      createdById: superAdmin.id,
    },
    update: {},
  });

  await prisma.post.upsert({
    where: { slug: "building-defensive-mindset" },
    create: {
      slug: "building-defensive-mindset",
      title: "Beyond Firewalls: The Architecture of Modern Defensive Security",
      excerpt:
        "Why perimeter defenses alone fail, and how zero trust architecture, least privilege, and telemetry pipelines transform organizational resilience.",
      content: `## The Fallacy of the Castle-and-Moat Architecture
Historically, network security operated under the castle-and-moat doctrine: everything inside the corporate perimeter was implicitly trusted, while everything outside was viewed with hostility.

With mobile devices, distributed microservices, and hybrid cloud environments, the perimeter has dissolved.

## Core Pillars of Resilient Security
1. **Explicit Verification**: Always authenticate and authorize based on all available data points (identity, device posture, location).
2. **Principle of Least Privilege (PoLP)**: Limit user and service access with Just-In-Time (JIT) and Just-Enough-Access (JEA).
3. **Assume Breach**: Segment networks, encrypt end-to-end telemetry, and treat internal network traffic with zero implicit trust.`,
      category: "Defensive Security",
      tags: "zero-trust, architecture, defense",
      status: PUBLISH_STATUS.PUBLISHED,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdById: coordinator.id,
    },
    update: {},
  });

  // 5. Placeholder Team Members (No invented real faculty/students; clear placeholders)
  const placeholderMembers = [
    {
      name: "[Faculty Coordinator Placeholder]",
      role: "Faculty Advisor & Security Mentor",
      category: "FACULTY",
      bio: "Department of Computer Science & Engineering. Advising the Syndicate on ethical research, curriculum integration, and responsible vulnerability disclosure.",
      email: "faculty.advisor@placeholder.college.edu",
      displayOrder: 1,
    },
    {
      name: "[Student President Placeholder]",
      role: "Club President & Lead Researcher",
      category: "CORE_TEAM",
      bio: "Senior undergraduate specializing in binary exploitation, reverse engineering, and collegiate CTF competition strategy.",
      githubUrl: "https://github.com",
      displayOrder: 2,
    },
    {
      name: "[Vice President Placeholder]",
      role: "Vice President & Operations Lead",
      category: "CORE_TEAM",
      bio: "Oversees club workshop scheduling, competition infrastructure, and member technical training pipelines.",
      displayOrder: 3,
    },
    {
      name: "[Technical Lead Placeholder]",
      role: "CTF Lead & Systems Defense",
      category: "LEAD",
      bio: "Leads weekly jeopardy challenge problem authoring, offensive/defensive labs, and platform engineering.",
      displayOrder: 4,
    },
  ];

  for (const m of placeholderMembers) {
    const existing = await prisma.teamMember.findFirst({
      where: { role: m.role },
    });
    if (!existing) {
      await prisma.teamMember.create({
        data: {
          name: m.name,
          role: m.role,
          category: m.category,
          bio: m.bio,
          email: m.email || null,
          githubUrl: m.githubUrl || null,
          displayOrder: m.displayOrder,
          isActive: true,
        },
      });
    }
  }

  // 6. Curated Cybersecurity Resources
  const sampleResources = [
    {
      title: "OverTheWire Wargames: Bandit",
      description:
        "The gold standard for beginners learning Linux fundamentals, bash scripting, file permissions, and basic command-line security.",
      category: "Linux & Wargames",
      url: "https://overthewire.org/wargames/bandit/",
      difficulty: "Beginner",
    },
    {
      title: "PortSwigger Web Security Academy",
      description:
        "Free, interactive online security training covering modern web vulnerabilities, written by the creators of Burp Suite.",
      category: "Web Security",
      url: "https://portswigger.net/web-security",
      difficulty: "Intermediate",
    },
    {
      title: "Pwnable.kr: Binary Exploitation",
      description:
        "Challenging binary exploitation wargame platform for mastering x86 stack smashing, ROP chains, and memory corruption.",
      category: "Binary Exploitation",
      url: "https://pwnable.kr/",
      difficulty: "Advanced",
    },
    {
      title: "Cryptohack: Learn Modern Cryptography",
      description:
        "Fun, interactive platform solving cryptography challenges from modular arithmetic to elliptic curves and lattice reduction.",
      category: "Cryptography",
      url: "https://cryptohack.org/",
      difficulty: "Intermediate",
    },
  ];

  for (const r of sampleResources) {
    const exists = await prisma.resource.findFirst({
      where: { title: r.title },
    });
    if (!exists) {
      await prisma.resource.create({
        data: {
          ...r,
          isPublished: true,
        },
      });
    }
  }

  console.log("--- SEEDING COMPLETED SUCCESSFULLY ---");
  console.log("Development Credentials:");
  console.log("  Super Admin: admin@shadowbyte.local / AdminDevPass123!");
  console.log("  Coordinator: coordinator@shadowbyte.local / CoordDevPass123!");
  console.log("  Student:     student@shadowbyte.local / StudentDevPass123!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
