import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminDb, FieldValue, Timestamp } from "../src/firebase/admin";
import { ROLES, PUBLISH_STATUS, EVENT_MODES } from "../src/lib/constants";
import { AuthUser } from "../src/lib/auth";
import { registerStudentForEvent } from "../src/services/eventService";
import { getSiteSettings, getContactMessages } from "../src/services/siteService";
import { createCoordinatorAccount } from "../src/services/userService";
import { provisionTestUser, cleanupTestUsers } from "./setup-firebase";

describe("Concurrent Firestore Transactions, Settings Persistence & Admin Workflows", () => {
  const uniqueSuffix = Date.now();
  const pw = "SecurePass123!";
  const createdUids: string[] = [];
  const createdEventIds: string[] = [];
  const createdRegIds: string[] = [];
  const createdContactIds: string[] = [];

  let adminUser: Awaited<ReturnType<typeof provisionTestUser>>;

  beforeAll(async () => {
    adminUser = await provisionTestUser({
      email: `int-admin-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Integration Super Admin",
      role: ROLES.SUPER_ADMIN,
    });
    createdUids.push(adminUser.uid);
  });

  afterAll(async () => {
    const db = getAdminDb();
    await Promise.all([
      ...createdRegIds.map((id) => db.collection("eventRegistrations").doc(id).delete().catch(() => {})),
      ...createdEventIds.map((id) => db.collection("events").doc(id).delete().catch(() => {})),
      ...createdContactIds.map((id) => db.collection("contactMessages").doc(id).delete().catch(() => {})),
    ]);
    await cleanupTestUsers(createdUids);
  });

  it("1. Concurrent student registrations never exceed strict Firestore event capacity", async () => {
    const db = getAdminDb();

    const eventRef = await db.collection("events").add({
      slug: `race-test-${uniqueSuffix}`,
      title: "Concurrent Capacity Stress Workshop",
      summary: "Verifying Firestore transactional isolation under concurrent requests.",
      description: "Multiple simultaneous students racing for the last 2 seats.",
      bannerUrl: null,
      mode: EVENT_MODES.VIRTUAL,
      venue: "Cyber Range",
      locationUrl: null,
      startDate: Timestamp.fromDate(new Date(Date.now() + 5 * 86400000)),
      endDate: Timestamp.fromDate(new Date(Date.now() + 6 * 86400000)),
      registrationDeadline: Timestamp.fromDate(new Date(Date.now() + 4 * 86400000)),
      capacity: 2,
      registeredCount: 0,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "CTF Competition",
      createdById: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    createdEventIds.push(eventRef.id);

    const racers = await Promise.all(
      [1, 2, 3].map((idx) =>
        provisionTestUser({
          email: `racer-${idx}-${uniqueSuffix}@shadowbyte.local`,
          password: pw,
          name: `Concurrent Student ${idx}`,
          role: ROLES.STUDENT,
          studentId: `RACE-${idx}`,
        })
      )
    );
    racers.forEach((r) => createdUids.push(r.uid));

    const results = await Promise.allSettled(
      racers.map((r) => {
        const authUser: AuthUser = {
          id: r.uid,
          uid: r.uid,
          email: r.email,
          name: r.name,
          role: ROLES.STUDENT,
          isActive: true,
          studentId: "RACE",
          department: "CSE",
        };
        return registerStudentForEvent(eventRef.id, authUser);
      })
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);

    fulfilled.forEach((r) => {
      if (r.status === "fulfilled") {
        createdRegIds.push(r.value.registrationId);
      }
    });

    const finalConfirmed = await db
      .collection("eventRegistrations")
      .where("eventId", "==", eventRef.id)
      .where("status", "==", "CONFIRMED")
      .get();

    expect(finalConfirmed.size).toBe(2);
    const updatedEventSnap = await eventRef.get();
    expect(updatedEventSnap.data()?.registeredCount).toBe(2);
  });

  it("2. Super Admin Coordinator provisioning & Site Settings Firestore persistence", async () => {
    const db = getAdminDb();
    const actor: AuthUser = {
      id: adminUser.uid,
      uid: adminUser.uid,
      email: adminUser.email,
      name: adminUser.name,
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      studentId: null,
      department: "Administration",
    };

    const coordEmail = `appointed-coord-${uniqueSuffix}@shadowbyte.local`;
    const createdCoord = await createCoordinatorAccount(
      {
        name: "Appointed Lead Coordinator",
        email: coordEmail,
        password: pw,
        department: "Network Security",
      },
      actor
    );
    createdUids.push(createdCoord.uid);
    expect(createdCoord.role).toBe(ROLES.COORDINATOR);

    const settingsRef = db.collection("siteSettings").doc("default");
    const beforeSnap = await settingsRef.get();
    const originalTagline =
      beforeSnap.data()?.mainTagline || "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.";

    const updatedTagline = "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT. [VERIFIED]";
    await settingsRef.set(
      {
        id: "default",
        clubName: "SHADOW BYTE SYNDICATE",
        supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
        mainTagline: updatedTagline,
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
          "Shadow Byte Syndicate is a student-led collegiate cybersecurity club focused on ethical research and defense.",
        ethicsStatement:
          "All offensive and defensive techniques are taught strictly for ethical cybersecurity.",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const freshSettings = await getSiteSettings();
    expect(freshSettings.mainTagline).toBe(updatedTagline);
    expect(freshSettings.contactEmail).toBe("");
    expect(freshSettings.headquarters).toBe("");

    // Restore tagline
    await settingsRef.update({
      mainTagline: originalTagline,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  it("3. Contact submissions persist cleanly to Cloud Firestore and are retrievable by Super Admin", async () => {
    const db = getAdminDb();
    const subject = `Integration Contact Probe ${uniqueSuffix}`;

    const ref = await db.collection("contactMessages").add({
      name: "External Faculty",
      email: "faculty@college.edu",
      subject,
      message: "Requesting details about sponsoring the next collegiate CTF event.",
      isRead: false,
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    createdContactIds.push(ref.id);

    const messages = await getContactMessages();
    expect(messages.some((m) => m.id === ref.id && m.subject === subject)).toBe(true);
  });
});
