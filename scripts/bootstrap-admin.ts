import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { ROLES } from "../src/lib/constants";
import crypto from "crypto";

async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.argv[2];
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.argv[3];
  const name = process.env.BOOTSTRAP_ADMIN_NAME || process.argv[4] || "Initial Super Admin";

  if (!email || !password) {
    console.error(
      "\n[ERROR] Missing required credentials.\n" +
        "Usage: npx tsx scripts/bootstrap-admin.ts <email> <password> [name]\n" +
        "Or set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD environment variables.\n"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("[ERROR] Password must be at least 8 characters long.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const passwordHash = await hashPassword(password);

  if (existing) {
    console.log(`[BOOTSTRAP] Updating existing account ${email} to SUPER_ADMIN...`);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        passwordHash,
      },
    });
    console.log(`[SUCCESS] Account ${updated.email} is now an active SUPER_ADMIN.`);
  } else {
    console.log(`[BOOTSTRAP] Creating new initial SUPER_ADMIN account: ${email}...`);
    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`[SUCCESS] Super Admin account created: ${created.email}`);
  }

  // Ensure default site settings exist
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      clubName: "SHADOW BYTE SYNDICATE",
      supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
      mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.",
      secondaryPhrase: "BEYOND FIREWALLS",
      contactEmail: "contact@shadowbyte.club",
      timezone: process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Kolkata",
      bannerUrl: "/assets/brand/banner.jpeg",
      shieldLogoUrl: "/assets/brand/shield-emblem.png",
      aboutSummary:
        "Shadow Byte Syndicate is a premier collegiate cybersecurity defense and ethical hacking research collective.",
      ethicsStatement:
        "We are strictly committed to ethical cybersecurity, responsible vulnerability disclosure, and defensive system hardening.",
    },
    update: {},
  });

  console.log("[BOOTSTRAP] Default site settings ensured.");
}

bootstrapAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
