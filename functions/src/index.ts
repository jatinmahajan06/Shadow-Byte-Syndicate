import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as v1 from "firebase-functions/v1";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "COORDINATOR", "STUDENT"]);

/**
 * Keeps Firebase Auth Custom Claims (`role`, `isActive`) and `disabled` flag
 * strictly synchronized with authoritative Cloud Firestore `users/{uid}` records.
 */
export const syncUserRoleClaims = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const afterData = event.data?.after?.data();

  if (!afterData) {
    return;
  }

  const role = ALLOWED_ROLES.has(afterData.role) ? (afterData.role as string) : "STUDENT";
  const isActive = afterData.isActive !== false;

  try {
    const userRecord = await auth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};

    if (currentClaims.role !== role || currentClaims.isActive !== isActive) {
      await auth.setCustomUserClaims(uid, {
        ...currentClaims,
        role,
        isActive,
      });
    }

    if (userRecord.disabled !== !isActive) {
      await auth.updateUser(uid, { disabled: !isActive });
      if (!isActive) {
        await auth.revokeRefreshTokens(uid);
      }
    }
  } catch (error) {
    console.error(`[syncUserRoleClaims] Error syncing user ${uid}:`, error);
  }
});

/**
 * Automatically reconciles parent Event `registeredCount` whenever an
 * `eventRegistrations/{regId}` document is created, updated, or deleted.
 */
export const syncEventRegistrationCount = onDocumentWritten(
  "eventRegistrations/{regId}",
  async (event) => {
    const afterData = event.data?.after?.data();
    const beforeData = event.data?.before?.data();
    const eventId = (afterData?.eventId || beforeData?.eventId) as string | undefined;

    if (!eventId) return;

    try {
      const eventRef = db.collection("events").doc(eventId);
      const eventSnap = await eventRef.get();
      if (!eventSnap.exists) return;

      const confirmedSnap = await db
        .collection("eventRegistrations")
        .where("eventId", "==", eventId)
        .where("status", "==", "CONFIRMED")
        .get();

      const actualCount = confirmedSnap.size;
      const recordedCount = Number(eventSnap.data()?.registeredCount || 0);

      if (actualCount !== recordedCount) {
        await eventRef.update({
          registeredCount: actualCount,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(`[syncEventRegistrationCount] Error syncing event ${eventId}:`, error);
    }
  }
);

/**
 * HTTPS Callable Cloud Function for atomic Student Event Registration.
 * Validates capacity, deadlines, and prevents duplicate bookings via Firestore Transactions.
 */
export const registerForEvent = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication is required to register.");
  }

  const uid = request.auth.uid;
  const eventId = typeof request.data?.eventId === "string" ? request.data.eventId.trim() : "";
  const notes =
    typeof request.data?.notes === "string" ? request.data.notes.trim().slice(0, 500) : null;

  if (!eventId) {
    throw new HttpsError("invalid-argument", "Valid eventId is required.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "User profile not found.");
  }

  const user = userSnap.data()!;
  if (user.isActive === false) {
    throw new HttpsError("permission-denied", "Account is deactivated.");
  }
  if (user.role !== "STUDENT") {
    throw new HttpsError("permission-denied", "Only student accounts can register for events.");
  }

  const result = await db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await tx.get(eventRef);

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event could not be found.");
    }

    const evt = eventSnap.data()!;
    if (evt.status !== "PUBLISHED" || evt.isRegistrationOpen === false) {
      throw new HttpsError("failed-precondition", "Registration is closed for this event.");
    }

    const now = new Date();
    const deadline = evt.registrationDeadline?.toDate
      ? evt.registrationDeadline.toDate()
      : new Date(evt.registrationDeadline);
    const start = evt.startDate?.toDate ? evt.startDate.toDate() : new Date(evt.startDate);

    if (now > deadline || now > start) {
      throw new HttpsError("failed-precondition", "Registration deadline has passed.");
    }

    const regId = `${eventId}_${uid}`;
    const regRef = db.collection("eventRegistrations").doc(regId);
    const regSnap = await tx.get(regRef);

    if (regSnap.exists && regSnap.data()?.status === "CONFIRMED") {
      throw new HttpsError("already-exists", "You are already registered for this event.");
    }

    const confirmedSnap = await tx.get(
      db
        .collection("eventRegistrations")
        .where("eventId", "==", eventId)
        .where("status", "==", "CONFIRMED")
    );

    if (confirmedSnap.size >= Number(evt.capacity)) {
      throw new HttpsError("resource-exhausted", "Event has reached full capacity.");
    }

    tx.set(regRef, {
      eventId,
      eventTitle: evt.title,
      eventSlug: evt.slug,
      eventSummary: evt.summary || "",
      eventBannerUrl: evt.bannerUrl || null,
      eventStartDate: evt.startDate,
      eventEndDate: evt.endDate,
      eventVenue: evt.venue,
      eventMode: evt.mode,
      eventCategory: evt.category,
      studentId: uid,
      studentName: user.name,
      studentEmail: user.email,
      studentRollId: user.studentId || null,
      studentDepartment: user.department || null,
      studentPhone: user.phone || null,
      status: "CONFIRMED",
      notes,
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(eventRef, {
      registeredCount: confirmedSnap.size + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { registrationId: regId, eventTitle: evt.title as string };
  });

  await Promise.all([
    db.collection("users").doc(uid).collection("activityHistory").add({
      action: "EVENT_REGISTERED",
      description: `Registered via Cloud Function for: ${result.eventTitle}`,
      metadata: { eventId, registrationId: result.registrationId },
      createdAt: FieldValue.serverTimestamp(),
    }),
    db.collection("auditLogs").add({
      action: "EVENT_REGISTRATION",
      entityType: "EventRegistration",
      entityId: result.registrationId,
      details: JSON.stringify({ eventId, eventTitle: result.eventTitle, studentEmail: user.email }),
      userId: uid,
      userEmail: user.email,
      createdAt: FieldValue.serverTimestamp(),
    }),
  ]);

  return {
    success: true,
    registrationId: result.registrationId,
    message: `Registration confirmed for ${result.eventTitle}.`,
  };
});

/**
 * Records Auth user creation in audit telemetry without racing API onboarding.
 */
export const auditAuthUserCreate = v1.auth.user().onCreate(async (user) => {
  try {
    await db.collection("auditLogs").add({
      action: "FIREBASE_AUTH_ACCOUNT_CREATED",
      entityType: "User",
      entityId: user.uid,
      details: JSON.stringify({ email: user.email || null }),
      userId: user.uid,
      userEmail: user.email || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[auditAuthUserCreate] Error writing audit entry:", err);
  }
});

