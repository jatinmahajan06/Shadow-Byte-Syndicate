import "dotenv/config";
import {
  getAdminAuth,
  getAdminDb,
  FieldValue,
  Timestamp,
} from "../src/firebase/admin";
import { ROLES, PUBLISH_STATUS, EVENT_MODES, UserRole } from "../src/lib/constants";

async function ensureAuthAndProfile(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  department: string;
  studentId?: string | null;
}) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const emailLower = input.email.toLowerCase();

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(emailLower);
    uid = existing.uid;
    await adminAuth.updateUser(uid, {
      password: input.password,
      displayName: input.name,
      disabled: false,
      emailVerified: true,
    });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "auth/user-not-found") {
      const created = await adminAuth.createUser({
        email: emailLower,
        password: input.password,
        displayName: input.name,
        disabled: false,
        emailVerified: true,
      });
      uid = created.uid;
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(uid, {
    role: input.role,
    isActive: true,
  });

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        email: emailLower,
        name: input.name,
        role: input.role,
        isActive: true,
        studentId: input.studentId || null,
        department: input.department,
        phone: null,
        photoURL: null,
        preferences: {
          notifications: true,
          theme: "dark",
        },
        registrationCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { uid, email: emailLower, name: input.name, role: input.role };
}

async function seedFirebase() {
  const isProdEnv =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const isLocalEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

  if (isProdEnv || !isLocalEmulator) {
    console.error(
      "[SEED BLOCKED] Demo fixture seeding is strictly disabled in production and non-emulator Firebase targets. " +
        "Use scripts/bootstrap-admin.ts to provision real administrator accounts and manage content via /admin."
    );
    process.exit(1);
  }

  const allowDemoFixtures =
    process.argv.includes("--with-demo-fixtures") ||
    process.env.ALLOW_DEV_DEMO_SEED === "true";

  if (!allowDemoFixtures) {
    console.log(
      "[SEED SKIPPED] Automatic demo fixture seeding is disabled so sample records are not repopulated.\n" +
        "To populate sample fixtures intentionally in the local Firebase Emulator only, run:\n" +
        "  npx tsx scripts/seed-firebase.ts --with-demo-fixtures\n" +
        "To provision a clean Super Admin account without demo content, run:\n" +
        "  npx tsx scripts/bootstrap-admin.ts <email> <password> \"<name>\""
    );
    process.exit(0);
  }

  console.log("--- SEEDING OPT-IN LOCAL DEV FIXTURES TO FIREBASE AUTH & FIRESTORE EMULATOR ---");

  const db = getAdminDb();

  // 1. Default Site Settings (without placeholder contacts or social handles)
  await db.collection("siteSettings").doc("default").set(
    {
      id: "default",
      clubName: "SHADOW BYTE SYNDICATE",
      supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
      mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.",
      secondaryPhrase: "BEYOND FIREWALLS",
      contactEmail: "",
      headquarters: "",
      timezone: "Asia/Kolkata",
      instagramHandle: "",
      youtubeChannel: "",
      discordInvite: "",
      bannerUrl: "/assets/brand/banner.jpeg",
      shieldLogoUrl: "/assets/brand/shield-emblem.png",
      aboutSummary:
        "Shadow Byte Syndicate is an elite student-led collegiate cybersecurity defense collective dedicated to hands-on security research, CTF competitions, threat intelligence, and digital defense.",
      ethicsStatement:
        "Shadow Byte Syndicate operates under strict ethical guidelines. All penetration testing and offensive techniques are practiced strictly in authorized sandboxed labs and sanctioned environments. We prioritize defensive security and responsible disclosure.",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // 2. Development Accounts
  const superAdmin = await ensureAuthAndProfile({
    email: "admin@shadowbyte.local",
    password: "AdminDevPass123!",
    name: "Super Admin [Dev Fixture]",
    role: ROLES.SUPER_ADMIN,
    department: "Cybersecurity Administration",
  });

  const coordinator = await ensureAuthAndProfile({
    email: "coordinator@shadowbyte.local",
    password: "CoordDevPass123!",
    name: "Coordinator [Dev Fixture]",
    role: ROLES.COORDINATOR,
    department: "Computer Science & Engineering",
  });

  await ensureAuthAndProfile({
    email: "student@shadowbyte.local",
    password: "StudentDevPass123!",
    name: "Alex Vance [Dev Student]",
    role: ROLES.STUDENT,
    department: "Information Technology",
    studentId: "CS2026-089",
  });

  // 3. Seed Events
  const now = new Date();
  const futureEvent1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureEvent1End = new Date(futureEvent1.getTime() + 4 * 60 * 60 * 1000);
  const futureDeadline1 = new Date(futureEvent1.getTime() - 24 * 60 * 60 * 1000);

  const futureEvent2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const futureEvent2End = new Date(futureEvent2.getTime() + 8 * 60 * 60 * 1000);
  const futureDeadline2 = new Date(futureEvent2.getTime() - 24 * 60 * 60 * 1000);

  const pastEvent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastEventEnd = new Date(pastEvent.getTime() + 3 * 60 * 60 * 1000);

  const eventsData = [
    {
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
      bannerUrl: null,
      mode: EVENT_MODES.IN_PERSON,
      venue: "Computer Systems Lab 4B (Main Campus)",
      locationUrl: null,
      startDate: Timestamp.fromDate(futureEvent1),
      endDate: Timestamp.fromDate(futureEvent1End),
      registrationDeadline: Timestamp.fromDate(futureDeadline1),
      capacity: 40,
      registeredCount: 0,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "Workshop",
      createdById: superAdmin.uid,
      createdByName: superAdmin.name,
      createdByEmail: superAdmin.email,
      createdByRole: superAdmin.role,
    },
    {
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
      bannerUrl: null,
      mode: EVENT_MODES.HYBRID,
      venue: "Auditorium Hall C & Discord Cyber Arena",
      locationUrl: null,
      startDate: Timestamp.fromDate(futureEvent2),
      endDate: Timestamp.fromDate(futureEvent2End),
      registrationDeadline: Timestamp.fromDate(futureDeadline2),
      capacity: 100,
      registeredCount: 0,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "CTF Competition",
      createdById: coordinator.uid,
      createdByName: coordinator.name,
      createdByEmail: coordinator.email,
      createdByRole: coordinator.role,
    },
    {
      slug: "intro-reverse-engineering-past",
      title: "Foundations of Reverse Engineering: Ghidra & x86 Assembly",
      summary:
        "Archive of our introductory reverse engineering workshop focusing on static disassembly and control flow analysis.",
      description:
        "Completed technical session on reverse engineering compiled binaries with Ghidra and IDA Free.",
      bannerUrl: null,
      mode: EVENT_MODES.IN_PERSON,
      venue: "Cyber Defense Lab 2A",
      locationUrl: null,
      startDate: Timestamp.fromDate(pastEvent),
      endDate: Timestamp.fromDate(pastEventEnd),
      registrationDeadline: Timestamp.fromDate(
        new Date(pastEvent.getTime() - 48 * 60 * 60 * 1000)
      ),
      capacity: 35,
      registeredCount: 0,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: false,
      category: "Workshop",
      createdById: superAdmin.uid,
      createdByName: superAdmin.name,
      createdByEmail: superAdmin.email,
      createdByRole: superAdmin.role,
    },
  ];

  for (const evt of eventsData) {
    const existing = await db.collection("events").where("slug", "==", evt.slug).limit(1).get();
    if (existing.empty) {
      await db.collection("events").add({
        ...evt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 4. Seed Knowledge Hub Posts
  const postsData = [
    {
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
      coverImage: null,
      category: "Security Research",
      tags: "web-security, javascript, vulnerability-analysis",
      status: PUBLISH_STATUS.PUBLISHED,
      publishedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
      createdById: superAdmin.uid,
      createdByName: superAdmin.name,
      createdByRole: superAdmin.role,
      createdByEmail: superAdmin.email,
    },
    {
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
      coverImage: null,
      category: "Defensive Security",
      tags: "zero-trust, architecture, defense",
      status: PUBLISH_STATUS.PUBLISHED,
      publishedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      createdById: coordinator.uid,
      createdByName: coordinator.name,
      createdByRole: coordinator.role,
      createdByEmail: coordinator.email,
    },
  ];

  for (const post of postsData) {
    const existing = await db.collection("posts").where("slug", "==", post.slug).limit(1).get();
    if (existing.empty) {
      await db.collection("posts").add({
        ...post,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 5. Team Members
  const placeholderMembers = [
    {
      name: "[Faculty Coordinator Placeholder]",
      role: "Faculty Advisor & Security Mentor",
      category: "FACULTY",
      bio: "Department of Computer Science & Engineering. Advising the Syndicate on ethical research, curriculum integration, and responsible vulnerability disclosure.",
      email: "faculty.advisor@placeholder.college.edu",
      githubUrl: null,
      linkedinUrl: null,
      photoUrl: null,
      displayOrder: 1,
      isActive: true,
    },
    {
      name: "[Student President Placeholder]",
      role: "Club President & Lead Researcher",
      category: "CORE_TEAM",
      bio: "Senior undergraduate specializing in binary exploitation, reverse engineering, and collegiate CTF competition strategy.",
      email: null,
      githubUrl: "https://github.com",
      linkedinUrl: null,
      photoUrl: null,
      displayOrder: 2,
      isActive: true,
    },
    {
      name: "[Vice President Placeholder]",
      role: "Vice President & Operations Lead",
      category: "CORE_TEAM",
      bio: "Oversees club workshop scheduling, competition infrastructure, and member technical training pipelines.",
      email: null,
      githubUrl: null,
      linkedinUrl: null,
      photoUrl: null,
      displayOrder: 3,
      isActive: true,
    },
    {
      name: "[Technical Lead Placeholder]",
      role: "CTF Lead & Systems Defense",
      category: "LEAD",
      bio: "Leads weekly jeopardy challenge problem authoring, offensive/defensive labs, and platform engineering.",
      email: null,
      githubUrl: null,
      linkedinUrl: null,
      photoUrl: null,
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const m of placeholderMembers) {
    const existing = await db.collection("teamMembers").where("role", "==", m.role).limit(1).get();
    if (existing.empty) {
      await db.collection("teamMembers").add({
        ...m,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 6. Learning Resources
  const sampleResources = [
    {
      title: "OverTheWire Wargames: Bandit",
      description:
        "The gold standard for beginners learning Linux fundamentals, bash scripting, file permissions, and basic command-line security.",
      category: "Linux & Wargames",
      url: "https://overthewire.org/wargames/bandit/",
      difficulty: "Beginner",
      isPublished: true,
    },
    {
      title: "PortSwigger Web Security Academy",
      description:
        "Free, interactive online security training covering modern web vulnerabilities, written by the creators of Burp Suite.",
      category: "Web Security",
      url: "https://portswigger.net/web-security",
      difficulty: "Intermediate",
      isPublished: true,
    },
    {
      title: "Pwnable.kr: Binary Exploitation",
      description:
        "Challenging binary exploitation wargame platform for mastering x86 stack smashing, ROP chains, and memory corruption.",
      category: "Binary Exploitation",
      url: "https://pwnable.kr/",
      difficulty: "Advanced",
      isPublished: true,
    },
    {
      title: "Cryptohack: Learn Modern Cryptography",
      description:
        "Fun, interactive platform solving cryptography challenges from modular arithmetic to elliptic curves and lattice reduction.",
      category: "Cryptography",
      url: "https://cryptohack.org/",
      difficulty: "Intermediate",
      isPublished: true,
    },
  ];

  for (const r of sampleResources) {
    const existing = await db.collection("resources").where("title", "==", r.title).limit(1).get();
    if (existing.empty) {
      await db.collection("resources").add({
        ...r,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log("--- FIREBASE SEEDING COMPLETED SUCCESSFULLY ---");
  console.log("Development Credentials:");
  console.log("  Super Admin: admin@shadowbyte.local / AdminDevPass123!");
  console.log("  Coordinator: coordinator@shadowbyte.local / CoordDevPass123!");
  console.log("  Student:     student@shadowbyte.local / StudentDevPass123!");
  process.exit(0);
}

seedFirebase().catch((err) => {
  console.error("[FIREBASE SEEDING FAILED]", err);
  process.exit(1);
});

