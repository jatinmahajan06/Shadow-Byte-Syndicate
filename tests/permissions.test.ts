import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getAdminDb, FieldValue } from "../src/firebase/admin";
import { ROLES, PUBLISH_STATUS } from "../src/lib/constants";
import { updateUserRoleAndStatus } from "../src/services/userService";
import {
  createIsolatedClient,
  provisionTestUser,
  cleanupTestUsers,
  assertSecurityDenied,
} from "./setup-firebase";

describe("RBAC Permission Matrix, User Data Isolation & Firestore Security Rules", () => {
  const uniqueSuffix = Date.now();
  const pw = "SecurePass123!";
  const createdUids: string[] = [];
  const createdEventIds: string[] = [];
  const createdPostIds: string[] = [];
  const createdRegIds: string[] = [];
  const createdAuditIds: string[] = [];
  const createdContactIds: string[] = [];

  let adminUser: Awaited<ReturnType<typeof provisionTestUser>>;
  let coordUser: Awaited<ReturnType<typeof provisionTestUser>>;
  let student1: Awaited<ReturnType<typeof provisionTestUser>>;
  let student2: Awaited<ReturnType<typeof provisionTestUser>>;

  beforeAll(async () => {
    adminUser = await provisionTestUser({
      email: `perm-admin-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Perm Admin",
      role: ROLES.SUPER_ADMIN,
    });
    coordUser = await provisionTestUser({
      email: `perm-coord-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Perm Coordinator",
      role: ROLES.COORDINATOR,
    });
    student1 = await provisionTestUser({
      email: `perm-stu1-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Student One",
      role: ROLES.STUDENT,
      studentId: "PERM-STU-1",
    });
    student2 = await provisionTestUser({
      email: `perm-stu2-${uniqueSuffix}@shadowbyte.local`,
      password: pw,
      name: "Student Two",
      role: ROLES.STUDENT,
      studentId: "PERM-STU-2",
    });
    createdUids.push(adminUser.uid, coordUser.uid, student1.uid, student2.uid);
  });

  afterAll(async () => {
    const db = getAdminDb();
    await Promise.all([
      ...createdRegIds.map((id) => db.collection("eventRegistrations").doc(id).delete().catch(() => {})),
      ...createdEventIds.map((id) => db.collection("events").doc(id).delete().catch(() => {})),
      ...createdPostIds.map((id) => db.collection("posts").doc(id).delete().catch(() => {})),
      ...createdAuditIds.map((id) => db.collection("auditLogs").doc(id).delete().catch(() => {})),
      ...createdContactIds.map((id) => db.collection("contactMessages").doc(id).delete().catch(() => {})),
    ]);
    await cleanupTestUsers(createdUids);
  });

  it("1. Unauthenticated visitors can read published content ONLY and are denied private/draft data", async () => {
    const anonClient = createIsolatedClient("anon");
    const adminDb = getAdminDb();

    const draftRef = await adminDb.collection("events").add({
      slug: `secret-draft-${uniqueSuffix}`,
      title: "Secret Draft Event",
      summary: "Draft summary must not leak to anonymous clients.",
      description: "Detailed classified schedule details for staff review only.",
      bannerUrl: null,
      mode: "VIRTUAL",
      venue: "Private",
      locationUrl: null,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 90000000),
      registrationDeadline: new Date(Date.now() + 80000000),
      capacity: 15,
      registeredCount: 0,
      status: PUBLISH_STATUS.DRAFT,
      isRegistrationOpen: true,
      category: "Workshop",
      createdById: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    createdEventIds.push(draftRef.id);

    try {
      await assertSecurityDenied(
        getDoc(doc(anonClient.db, "events", draftRef.id)),
        "anon read draft event"
      );
      await assertSecurityDenied(
        getDocs(collection(anonClient.db, "users")),
        "anon list users"
      );
      await assertSecurityDenied(
        getDocs(collection(anonClient.db, "eventRegistrations")),
        "anon list registrations"
      );
      await assertSecurityDenied(
        getDocs(collection(anonClient.db, "auditLogs")),
        "anon list auditLogs"
      );
      await assertSecurityDenied(
        getDocs(collection(anonClient.db, "contactMessages")),
        "anon list contactMessages"
      );
    } finally {
      await anonClient.cleanup();
    }
  });

  it("2. Student can update own safe profile fields & activityHistory but CANNOT escalate role/isActive or read other students' data", async () => {
    const stu1Client = createIsolatedClient("stu1");
    const stu2Client = createIsolatedClient("stu2");
    const adminDb = getAdminDb();

    const pubEventRef = await adminDb.collection("events").add({
      slug: `iso-pub-${uniqueSuffix}`,
      title: "Isolation Check Event",
      summary: "Event verifying strict student registration isolation.",
      description: "Full description of isolation check event for automated verification.",
      bannerUrl: null,
      mode: "IN_PERSON",
      venue: "Lab 101",
      locationUrl: null,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 90000000),
      registrationDeadline: new Date(Date.now() + 80000000),
      capacity: 25,
      registeredCount: 1,
      status: PUBLISH_STATUS.PUBLISHED,
      isRegistrationOpen: true,
      category: "Workshop",
      createdById: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    createdEventIds.push(pubEventRef.id);

    const regId = `${pubEventRef.id}_${student1.uid}`;
    await adminDb.collection("eventRegistrations").doc(regId).set({
      eventId: pubEventRef.id,
      eventTitle: "Isolation Check Event",
      eventSlug: `iso-pub-${uniqueSuffix}`,
      studentId: student1.uid,
      studentName: student1.name,
      studentEmail: student1.email,
      status: "CONFIRMED",
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    createdRegIds.push(regId);

    try {
      await signInWithEmailAndPassword(stu1Client.auth, student1.email, pw);
      await signInWithEmailAndPassword(stu2Client.auth, student2.email, pw);

      // Student 1 CAN update allowed profile fields
      await updateDoc(doc(stu1Client.db, "users", student1.uid), {
        name: "Student One Updated",
        department: "Network Security",
        updatedAt: serverTimestamp(),
      });

      const ownSnap = await getDoc(doc(stu1Client.db, "users", student1.uid));
      expect(ownSnap.data()?.name).toBe("Student One Updated");

      // Student 1 CAN write own valid PROFILE_UPDATED activityHistory entry
      await addDoc(collection(stu1Client.db, "users", student1.uid, "activityHistory"), {
        action: "PROFILE_UPDATED",
        description: "Updated profile department.",
        metadata: { updatedFields: ["name", "department", "updatedAt"] },
        createdAt: serverTimestamp(),
      });

      // Student 1 CAN read own registration
      const ownRegSnap = await getDoc(doc(stu1Client.db, "eventRegistrations", regId));
      expect(ownRegSnap.exists()).toBe(true);
      expect(ownRegSnap.data()?.studentId).toBe(student1.uid);

      // Student 1 CANNOT escalate role or toggle isActive or modify registrationCount
      await assertSecurityDenied(
        updateDoc(doc(stu1Client.db, "users", student1.uid), {
          role: ROLES.SUPER_ADMIN,
          updatedAt: serverTimestamp(),
        }),
        "student escalate own role"
      );
      await assertSecurityDenied(
        updateDoc(doc(stu1Client.db, "users", student1.uid), {
          isActive: false,
          updatedAt: serverTimestamp(),
        }),
        "student mutate isActive"
      );

      // Student 1 CANNOT write client-side to eventRegistrations, events, posts, or siteSettings
      await assertSecurityDenied(
        setDoc(doc(stu1Client.db, "eventRegistrations", `${pubEventRef.id}_${student1.uid}`), {
          status: "CANCELLED",
        }),
        "student direct write eventRegistrations"
      );
      await assertSecurityDenied(
        setDoc(doc(stu1Client.db, "siteSettings", "default"), { clubName: "PWNED" }),
        "student write siteSettings"
      );

      // Student 2 CANNOT read Student 1's registration, profile, or activityHistory
      await assertSecurityDenied(
        getDoc(doc(stu2Client.db, "eventRegistrations", regId)),
        "student2 get student1 registration"
      );
      await assertSecurityDenied(
        getDocs(
          query(
            collection(stu2Client.db, "eventRegistrations"),
            where("studentId", "==", student1.uid)
          )
        ),
        "student2 query student1 registrations"
      );
      await assertSecurityDenied(
        getDoc(doc(stu2Client.db, "users", student1.uid)),
        "student2 get student1 profile"
      );
      await assertSecurityDenied(
        getDocs(collection(stu2Client.db, "users", student1.uid, "activityHistory")),
        "student2 list student1 activityHistory"
      );
    } finally {
      await stu1Client.cleanup();
      await stu2Client.cleanup();
    }
  });

  it("3. Coordinators can create/edit events & posts, but CANNOT delete them or access admin-only collections", async () => {
    const coordClient = createIsolatedClient("coord");
    const adminClient = createIsolatedClient("admin-rules");
    const adminDb = getAdminDb();

    const auditRef = await adminDb.collection("auditLogs").add({
      action: "TEST_AUDIT",
      entityType: "System",
      entityId: "1",
      userId: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    createdAuditIds.push(auditRef.id);

    const msgRef = await adminDb.collection("contactMessages").add({
      name: "Sender",
      email: "sender@example.com",
      subject: "Security Question",
      message: "How do I join Shadow Byte Syndicate CTF workshops?",
      isRead: false,
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    createdContactIds.push(msgRef.id);

    try {
      await signInWithEmailAndPassword(coordClient.auth, coordUser.email, pw);
      await signInWithEmailAndPassword(adminClient.auth, adminUser.email, pw);

      // Coordinator CAN create an event directly under Firestore rules with valid schema
      const coordEventRef = doc(collection(coordClient.db, "events"));
      createdEventIds.push(coordEventRef.id);

      await setDoc(coordEventRef, {
        title: "Coordinator Security Rules Event",
        slug: `coord-rules-evt-${uniqueSuffix}`,
        summary: "Created via Client SDK to validate Firestore Security Rules for Coordinator.",
        description: "Detailed technical curriculum for validating Coordinator event authoring rules.",
        bannerUrl: null,
        mode: "HYBRID",
        venue: "Main Auditorium",
        locationUrl: null,
        startDate: Timestamp.fromDate(new Date(Date.now() + 86400000)),
        endDate: Timestamp.fromDate(new Date(Date.now() + 90000000)),
        registrationDeadline: Timestamp.fromDate(new Date(Date.now() + 80000000)),
        capacity: 50,
        registeredCount: 0,
        status: PUBLISH_STATUS.DRAFT,
        isRegistrationOpen: true,
        category: "Workshop",
        createdById: coordUser.uid,
        createdByName: coordUser.name,
        createdByEmail: coordUser.email,
        createdByRole: ROLES.COORDINATOR,
        updatedById: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Coordinator CAN edit & publish the event
      await updateDoc(coordEventRef, {
        status: PUBLISH_STATUS.PUBLISHED,
        updatedById: coordUser.uid,
        updatedAt: serverTimestamp(),
      });

      // Coordinator CANNOT tamper with registeredCount
      await assertSecurityDenied(
        updateDoc(coordEventRef, {
          registeredCount: 99,
          updatedAt: serverTimestamp(),
        }),
        "coordinator mutate registeredCount"
      );

      // Coordinator CANNOT delete the event
      await assertSecurityDenied(
        deleteDoc(coordEventRef),
        "coordinator delete event"
      );

      // Coordinator CAN create & update a post
      const coordPostRef = doc(collection(coordClient.db, "posts"));
      createdPostIds.push(coordPostRef.id);
      await setDoc(coordPostRef, {
        title: "Coordinator Rules Research Post",
        slug: `coord-rules-post-${uniqueSuffix}`,
        excerpt: "Summary verifying coordinator create and edit rules on Firestore.",
        content: "Comprehensive research article validating Firestore Security Rules constraints cleanly.",
        coverImage: null,
        category: "Security Research",
        tags: "rules,testing",
        status: PUBLISH_STATUS.PUBLISHED,
        publishedAt: serverTimestamp(),
        createdById: coordUser.uid,
        createdByName: coordUser.name,
        createdByRole: ROLES.COORDINATOR,
        createdByEmail: coordUser.email,
        updatedById: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Coordinator CANNOT delete post
      await assertSecurityDenied(
        deleteDoc(coordPostRef),
        "coordinator delete post"
      );

      // Coordinator DENIED access to registrations, auditLogs, contactMessages, siteSettings
      await assertSecurityDenied(
        getDocs(collection(coordClient.db, "eventRegistrations")),
        "coordinator list eventRegistrations"
      );
      await assertSecurityDenied(
        getDocs(collection(coordClient.db, "auditLogs")),
        "coordinator list auditLogs"
      );
      await assertSecurityDenied(
        getDocs(collection(coordClient.db, "contactMessages")),
        "coordinator list contactMessages"
      );
      await assertSecurityDenied(
        setDoc(doc(coordClient.db, "siteSettings", "default"), { clubName: "HIJACKED" }),
        "coordinator write siteSettings"
      );

      // SUPER ADMIN CAN update siteSettings with empty unconfigured contactEmail & optional headquarters
      await setDoc(
        doc(adminClient.db, "siteSettings", "default"),
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
            "Shadow Byte Syndicate is a collegiate cybersecurity collective focused on ethical security research.",
          ethicsStatement:
            "All technical sessions operate under strict authorization, defensive research, and responsible disclosure.",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // SUPER ADMIN CAN delete events/posts, but auditLogs remain strictly append-only (cannot delete)
      await assertSecurityDenied(
        deleteDoc(doc(adminClient.db, "auditLogs", auditRef.id)),
        "super admin delete auditLogs"
      );
      await deleteDoc(doc(adminClient.db, "events", coordEventRef.id));
      await deleteDoc(doc(adminClient.db, "posts", coordPostRef.id));
    } finally {
      await coordClient.cleanup();
      await adminClient.cleanup();
    }
  });

  it("4. Last active Super Admin cannot be deactivated or demoted by server guard", async () => {
    const adminDb = getAdminDb();

    // Snapshot currently active SUPER_ADMIN docs so we can safely isolate and test sole-admin guard
    const activeAdminsSnap = await adminDb
      .collection("users")
      .where("role", "==", ROLES.SUPER_ADMIN)
      .where("isActive", "==", true)
      .get();

    const otherAdminIds = activeAdminsSnap.docs
      .map((d) => d.id)
      .filter((id) => id !== adminUser.uid);

    // Temporarily deactivate other test/fixture admins so `adminUser` is the sole active SUPER_ADMIN
    await Promise.all(
      otherAdminIds.map((id) =>
        adminDb.collection("users").doc(id).update({ isActive: false })
      )
    );

    const actor = {
      id: adminUser.uid,
      uid: adminUser.uid,
      email: adminUser.email,
      name: adminUser.name,
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      studentId: null,
      department: "Security",
    };

    try {
      await expect(
        updateUserRoleAndStatus(adminUser.uid, { isActive: false }, actor)
      ).rejects.toThrow("LAST_SUPER_ADMIN_PROTECTION");

      await expect(
        updateUserRoleAndStatus(adminUser.uid, { role: ROLES.STUDENT }, actor)
      ).rejects.toThrow("LAST_SUPER_ADMIN_PROTECTION");
    } finally {
      await Promise.all(
        otherAdminIds.map((id) =>
          adminDb.collection("users").doc(id).update({ isActive: true })
        )
      );
    }
  });
});
