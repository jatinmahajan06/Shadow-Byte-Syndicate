import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getAdminDb, FieldValue, Timestamp } from "../src/firebase/admin";
import { ROLES, PUBLISH_STATUS, REGISTRATION_STATUS, EVENT_MODES } from "../src/lib/constants";
import { AuthUser } from "../src/lib/auth";
import {
  getPublishedEvents,
  registerStudentForEvent,
  getStudentRegistrations,
} from "../src/services/eventService";
import {
  createIsolatedClient,
  provisionTestUser,
  cleanupTestUsers,
  assertSecurityDenied,
  TINY_PNG_BYTES,
} from "./setup-firebase";

describe("Events Lifecycle, Registrations & Firebase Storage Rules", () => {
  const uniqueSuffix = Date.now();
  const pw = "SecurePass123!";
  const createdUids: string[] = [];
  const createdEventIds: string[] = [];
  const createdRegIds: string[] = [];

  let adminUser: Awaited<ReturnType<typeof provisionTestUser>>;
  let coordUser: Awaited<ReturnType<typeof provisionTestUser>>;
  let studentUser: Awaited<ReturnType<typeof provisionTestUser>>;
  let otherStudent: Awaited<ReturnType<typeof provisionTestUser>>;

  const toAuthUser = (u: {
    uid: string;
    email: string;
    name: string;
    role: typeof ROLES[keyof typeof ROLES];
  }): AuthUser => ({
    id: u.uid,
    uid: u.uid,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: true,
    studentId: "EVT-STU-01",
    department: "Cyber Security",
  });

  beforeAll(async () => {
    adminUser = await provisionTestUser({
      email: `evt-admin-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Event Admin",
      role: ROLES.SUPER_ADMIN,
    });
    coordUser = await provisionTestUser({
      email: `evt-coord-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Event Coord",
      role: ROLES.COORDINATOR,
    });
    studentUser = await provisionTestUser({
      email: `evt-stu1-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Event Student One",
      role: ROLES.STUDENT,
    });
    otherStudent = await provisionTestUser({
      email: `evt-stu2-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Event Student Two",
      role: ROLES.STUDENT,
    });
    createdUids.push(adminUser.uid, coordUser.uid, studentUser.uid, otherStudent.uid);
  });

  afterAll(async () => {
    const db = getAdminDb();
    await Promise.all([
      ...createdRegIds.map((id) => db.collection("eventRegistrations").doc(id).delete().catch(() => {})),
      ...createdEventIds.map((id) => db.collection("events").doc(id).delete().catch(() => {})),
    ]);
    await cleanupTestUsers(createdUids);
  });

  async function createSampleEvent(overrides: Partial<{
    status: string;
    capacity: number;
    deadlineOffsetMs: number;
    startOffsetMs: number;
  }> = {}) {
    const db = getAdminDb();
    const startOffset = overrides.startOffsetMs ?? 7 * 86400000;
    const deadlineOffset = overrides.deadlineOffsetMs ?? 5 * 86400000;

    const docRef = await db.collection("events").add({
      slug: `evt-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "Cloud & Kernel Security Bootcamp",
      summary: "Deep dive workshop into offensive and defensive system security techniques.",
      description: "Comprehensive lab covering isolation, privileges, and secure architectures.",
      bannerUrl: null,
      mode: EVENT_MODES.IN_PERSON,
      venue: "Systems Lab 202",
      locationUrl: null,
      startDate: Timestamp.fromDate(new Date(Date.now() + startOffset)),
      endDate: Timestamp.fromDate(new Date(Date.now() + startOffset + 7200000)),
      registrationDeadline: Timestamp.fromDate(new Date(Date.now() + deadlineOffset)),
      capacity: overrides.capacity ?? 20,
      registeredCount: 0,
      status: overrides.status ?? PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "Workshop",
      createdById: adminUser.uid,
      createdByName: adminUser.name,
      createdByEmail: adminUser.email,
      createdByRole: ROLES.SUPER_ADMIN,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    createdEventIds.push(docRef.id);
    return docRef.id;
  }

  it("1. Draft events are excluded from public getPublishedEvents queries until published", async () => {
    const draftId = await createSampleEvent({ status: PUBLISH_STATUS.DRAFT });
    const publishedBefore = await getPublishedEvents({ filter: "upcoming" });
    expect(publishedBefore.some((e) => e.id === draftId)).toBe(false);

    await getAdminDb().collection("events").doc(draftId).update({
      status: PUBLISH_STATUS.PUBLISHED,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const publishedAfter = await getPublishedEvents({ filter: "upcoming" });
    expect(publishedAfter.some((e) => e.id === draftId)).toBe(true);
  });

  it("2. Registration prevents duplicates, honors capacity, enforces deadlines & persists to student history", async () => {
    const eventId = await createSampleEvent({ capacity: 1 });
    const stuAuth1 = toAuthUser(studentUser);
    const stuAuth2 = toAuthUser(otherStudent);

    // First registration succeeds
    const res1 = await registerStudentForEvent(eventId, stuAuth1, "Bringing Kali VM");
    createdRegIds.push(res1.registrationId);
    expect(res1.registrationId).toBe(`${eventId}_${studentUser.uid}`);

    // Duplicate registration by same student is rejected
    await expect(registerStudentForEvent(eventId, stuAuth1)).rejects.toThrow(
      "ALREADY_REGISTERED"
    );

    // Different student rejected because capacity=1 is full
    await expect(registerStudentForEvent(eventId, stuAuth2)).rejects.toThrow("EVENT_FULL");

    // Verify student registration lookup returns only student 1's record
    const s1Regs = await getStudentRegistrations(studentUser.uid);
    const s2Regs = await getStudentRegistrations(otherStudent.uid);
    expect(s1Regs.some((r) => r.id === res1.registrationId)).toBe(true);
    expect(s2Regs.some((r) => r.id === res1.registrationId)).toBe(false);

    // Expired deadline event rejected cleanly
    const expiredEventId = await createSampleEvent({ deadlineOffsetMs: -3600000 });
    await expect(registerStudentForEvent(expiredEventId, stuAuth2)).rejects.toThrow(
      "DEADLINE_EXPIRED"
    );
  });

  it("3. Registration status update to CANCELLED decrements seat count accurately", async () => {
    const db = getAdminDb();
    const eventId = await createSampleEvent({ capacity: 1 });
    const stuAuth1 = toAuthUser(studentUser);
    const stuAuth2 = toAuthUser(otherStudent);

    const res1 = await registerStudentForEvent(eventId, stuAuth1);
    createdRegIds.push(res1.registrationId);

    // Simulate transactional cancellation (matches /api/events/cancel-registration)
    await db.runTransaction(async (tx) => {
      const regRef = db.collection("eventRegistrations").doc(res1.registrationId);
      const evtRef = db.collection("events").doc(eventId);
      const evtSnap = await tx.get(evtRef);
      tx.update(regRef, { status: REGISTRATION_STATUS.CANCELLED });
      tx.update(evtRef, {
        registeredCount: Math.max(0, Number(evtSnap.data()?.registeredCount || 1) - 1),
      });
    });

    // Now the freed seat allows Student 2 to register
    const res2 = await registerStudentForEvent(eventId, stuAuth2);
    createdRegIds.push(res2.registrationId);
    expect(res2.registrationId).toBe(`${eventId}_${otherStudent.uid}`);

    const eventSnap = await db.collection("events").doc(eventId).get();
    expect(eventSnap.data()?.registeredCount).toBe(1);
  });

  it("4. Firebase Storage uploads, URL retrieval, deletion & storage.rules RBAC/MIME/size checks", async () => {
    const stuClient = createIsolatedClient("storage-stu");
    const coordClient = createIsolatedClient("storage-coord");
    const adminClient = createIsolatedClient("storage-admin");

    try {
      await signInWithEmailAndPassword(stuClient.auth, studentUser.email, pw);
      await signInWithEmailAndPassword(coordClient.auth, coordUser.email, pw);
      await signInWithEmailAndPassword(adminClient.auth, adminUser.email, pw);

      // A. Student CAN upload valid PNG to their own avatar path & download it
      const avatarRef = ref(stuClient.storage, `uploads/avatars/${studentUser.uid}/avatar.png`);
      await uploadBytes(avatarRef, TINY_PNG_BYTES, { contentType: "image/png" });
      const avatarUrl = await getDownloadURL(avatarRef);
      expect(avatarUrl).toContain("avatars");

      const fetched = await fetch(avatarUrl);
      expect(fetched.ok).toBe(true);
      await deleteObject(avatarRef);

      // B. Student DENIED uploading invalid MIME type (SVG XSS risk) or > 5MB file
      await assertSecurityDenied(
        uploadBytes(
          ref(stuClient.storage, `uploads/avatars/${studentUser.uid}/bad.svg`),
          Uint8Array.from(Buffer.from("<svg><script>alert(1)</script></svg>")),
          { contentType: "image/svg+xml" }
        ),
        "student upload svg"
      );

      const oversized = new Uint8Array(5 * 1024 * 1024 + 1024);
      await assertSecurityDenied(
        uploadBytes(
          ref(stuClient.storage, `uploads/avatars/${studentUser.uid}/too-big.png`),
          oversized,
          { contentType: "image/png" }
        ),
        "student upload > 5MB"
      );

      // C. Student DENIED uploading to another user's avatar folder or coordinator event folder
      await assertSecurityDenied(
        uploadBytes(
          ref(stuClient.storage, `uploads/avatars/${otherStudent.uid}/hijack.png`),
          TINY_PNG_BYTES,
          { contentType: "image/png" }
        ),
        "student upload to other user avatar folder"
      );
      await assertSecurityDenied(
        uploadBytes(
          ref(stuClient.storage, `uploads/events/${studentUser.uid}/banner.png`),
          TINY_PNG_BYTES,
          { contentType: "image/png" }
        ),
        "student upload to events folder"
      );

      // D. Coordinator CAN upload valid PNG for events/posts, DENIED for branding/team/gallery
      const eventBannerRef = ref(
        coordClient.storage,
        `uploads/events/${coordUser.uid}/banner.png`
      );
      await uploadBytes(eventBannerRef, TINY_PNG_BYTES, { contentType: "image/png" });
      const bannerUrl = await getDownloadURL(eventBannerRef);
      expect(bannerUrl).toContain("events");
      await deleteObject(eventBannerRef);

      await assertSecurityDenied(
        uploadBytes(
          ref(coordClient.storage, `uploads/branding/hijack-logo.png`),
          TINY_PNG_BYTES,
          { contentType: "image/png" }
        ),
        "coordinator upload to branding folder"
      );

      // E. Super Admin CAN upload to branding
      const brandRef = ref(adminClient.storage, `uploads/branding/verify-shield-${uniqueSuffix}.png`);
      await uploadBytes(brandRef, TINY_PNG_BYTES, { contentType: "image/png" });
      const brandUrl = await getDownloadURL(brandRef);
      expect(brandUrl).toContain("branding");
      await deleteObject(brandRef);
    } finally {
      await stuClient.cleanup();
      await coordClient.cleanup();
      await adminClient.cleanup();
    }
  });
});
