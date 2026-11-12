import "dotenv/config";
import {
  getAdminAuth,
  getAdminDb,
  FieldValue,
} from "../src/firebase/admin";
import { ROLES } from "../src/lib/constants";

async function bootstrapAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || process.argv[2] || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.argv[3];
  const name = (
    process.env.BOOTSTRAP_ADMIN_NAME ||
    process.argv[4] ||
    "Initial Super Admin"
  ).trim();

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

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  let uid: string;

  try {
    const existingAuth = await adminAuth.getUserByEmail(email);
    uid = existingAuth.uid;
    console.log(`[BOOTSTRAP] Found existing Firebase Auth user (${uid}). Promoting to SUPER_ADMIN...`);
    await adminAuth.updateUser(uid, {
      password,
      displayName: name,
      disabled: false,
      emailVerified: true,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      console.log(`[BOOTSTRAP] Creating new Firebase Auth SUPER_ADMIN user for ${email}...`);
      const created = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        disabled: false,
        emailVerified: true,
      });
      uid = created.uid;
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(uid, {
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  });

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        email,
        name,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        studentId: null,
        department: "Cybersecurity Administration",
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

  // Ensure default site settings exist in Cloud Firestore (no placeholder contacts/handles)
  const settingsRef = db.collection("siteSettings").doc("default");
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) {
    await settingsRef.set({
      id: "default",
      clubName: "SHADOW BYTE SYNDICATE",
      supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
      mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.",
      secondaryPhrase: "BEYOND FIREWALLS",
      contactEmail: "",
      headquarters: "",
      timezone: process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Kolkata",
      instagramHandle: "",
      youtubeChannel: "",
      discordInvite: "",
      bannerUrl: "/assets/brand/banner.jpeg",
      shieldLogoUrl: "/assets/brand/shield-emblem.png",
      aboutSummary:
        "Shadow Byte Syndicate is an elite student-led collegiate cybersecurity defense collective dedicated to hands-on security research, CTF competitions, threat intelligence, and digital defense.",
      ethicsStatement:
        "We are strictly committed to ethical cybersecurity, responsible vulnerability disclosure, and defensive system hardening.",
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("[BOOTSTRAP] Default Firestore siteSettings created.");
  }

  console.log(`[SUCCESS] Account ${email} (UID: ${uid}) is now an active SUPER_ADMIN in Firebase Auth & Firestore.`);
  process.exit(0);
}

bootstrapAdmin().catch((err) => {
  console.error("[BOOTSTRAP FAILED]", err);
  process.exit(1);
});
