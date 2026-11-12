import { getAdminDb, FieldValue, Timestamp, isFirebaseAdminConfigured } from "@/firebase/admin";
import { PUBLISH_STATUS, REGISTRATION_STATUS } from "@/lib/constants";
import { toSerializable } from "./firestoreConverters";
import { AuthUser } from "@/lib/auth";
import { recordUserActivity, logAudit } from "@/lib/audit";

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  bannerUrl: string | null;
  mode: string;
  venue: string;
  locationUrl: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity: number;
  registeredCount: number;
  status: string;
  isRegistrationOpen: boolean;
  category: string;
  createdById: string;
  createdByName?: string;
  createdByEmail?: string;
  createdBy?: { name: string; email?: string; role?: string };
  _count: { registrations: number };
  createdAt?: string;
  updatedAt?: string;
}

export async function getPublishedEvents(options?: {
  filter?: "upcoming" | "past";
  search?: string;
  mode?: string;
  limitCount?: number;
}): Promise<EventRecord[]> {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const filter = options?.filter || "upcoming";
  const now = Timestamp.fromDate(new Date());

  let q = db
    .collection("events")
    .where("status", "==", PUBLISH_STATUS.PUBLISHED) as FirebaseFirestore.Query;

  if (options?.mode && options.mode !== "ALL") {
    q = q.where("mode", "==", options.mode);
  }

  if (filter === "past") {
    q = q.where("startDate", "<", now).orderBy("startDate", "desc");
  } else {
    q = q.where("startDate", ">=", now).orderBy("startDate", "asc");
  }

  const snap = await q.get();
  let items = snap.docs.map((doc) => {
    const data = doc.data();
    const count = Number(data.registeredCount || 0);
    return toSerializable<EventRecord>({
      id: doc.id,
      ...data,
      registeredCount: count,
      _count: { registrations: count },
      createdBy: {
        name: data.createdByName || "Club Organizer",
        email: data.createdByEmail || "",
      },
    });
  });

  if (options?.search) {
    const term = options.search.toLowerCase();
    items = items.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.summary.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.venue.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
    );
  }

  if (options?.limitCount && options.limitCount > 0) {
    items = items.slice(0, options.limitCount);
  }

  return items;
}

export async function getAllEvents(statusFilter?: string, mode?: string, category?: string, search?: string): Promise<EventRecord[]> {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  let q = db.collection("events") as FirebaseFirestore.Query;

  if (statusFilter && statusFilter !== "ALL") {
    q = q.where("status", "==", statusFilter);
  }
  if (mode && mode !== "ALL") {
    q = q.where("mode", "==", mode);
  }
  if (category && category !== "ALL") {
    q = q.where("category", "==", category);
  }

  const snap = await q.orderBy("createdAt", "desc").get().catch(async () => {
    // Fallback without composite index if arbitrary staff filters are combined
    const fallbackSnap = await db.collection("events").orderBy("createdAt", "desc").get();
    return fallbackSnap;
  });

  let items = snap.docs.map((doc) => {
    const data = doc.data();
    const count = Number(data.registeredCount || 0);
    return toSerializable<EventRecord>({
      id: doc.id,
      ...data,
      registeredCount: count,
      _count: { registrations: count },
      createdBy: {
        name: data.createdByName || "Club Organizer",
        email: data.createdByEmail || "",
      },
    });
  });

  if (statusFilter && statusFilter !== "ALL") {
    items = items.filter((i) => i.status === statusFilter);
  }
  if (mode && mode !== "ALL") {
    items = items.filter((i) => i.mode === mode);
  }
  if (category && category !== "ALL") {
    items = items.filter((i) => i.category === category);
  }
  if (search) {
    const term = search.toLowerCase();
    items = items.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.summary.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term)
    );
  }

  return items;
}

export async function getEventBySlug(slug: string): Promise<EventRecord | null> {
  if (!isFirebaseAdminConfigured()) return null;

  const db = getAdminDb();
  const snap = await db.collection("events").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  const count = Number(data.registeredCount || 0);

  return toSerializable<EventRecord>({
    id: doc.id,
    ...data,
    registeredCount: count,
    _count: { registrations: count },
    createdBy: {
      name: data.createdByName || "Club Organizer",
      email: data.createdByEmail || "",
      role: data.createdByRole || "COORDINATOR",
    },
  });
}

export async function registerStudentForEvent(
  eventId: string,
  user: AuthUser,
  notes?: string
) {
  const db = getAdminDb();

  const result = await db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await tx.get(eventRef);

    if (!eventSnap.exists) {
      throw new Error("EVENT_NOT_FOUND");
    }

    const event = eventSnap.data()!;
    if (event.status !== PUBLISH_STATUS.PUBLISHED) {
      throw new Error("EVENT_NOT_PUBLISHED");
    }
    if (event.isRegistrationOpen === false) {
      throw new Error("REGISTRATION_CLOSED_BY_ADMIN");
    }

    const now = new Date();
    const deadlineDate = event.registrationDeadline?.toDate
      ? event.registrationDeadline.toDate()
      : new Date(event.registrationDeadline);
    const startDate = event.startDate?.toDate
      ? event.startDate.toDate()
      : new Date(event.startDate);

    if (now > deadlineDate) {
      throw new Error("DEADLINE_EXPIRED");
    }
    if (now > startDate) {
      throw new Error("EVENT_ALREADY_STARTED");
    }

    const regId = `${eventId}_${user.uid}`;
    const regRef = db.collection("eventRegistrations").doc(regId);
    const existingRegSnap = await tx.get(regRef);

    if (
      existingRegSnap.exists &&
      existingRegSnap.data()?.status === REGISTRATION_STATUS.CONFIRMED
    ) {
      throw new Error("ALREADY_REGISTERED");
    }

    // Transactional seat count query
    const confirmedSnap = await tx.get(
      db
        .collection("eventRegistrations")
        .where("eventId", "==", eventId)
        .where("status", "==", REGISTRATION_STATUS.CONFIRMED)
    );

    const confirmedCount = confirmedSnap.size;
    if (confirmedCount >= Number(event.capacity)) {
      throw new Error("EVENT_FULL");
    }

    const payload = {
      eventId,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventSummary: event.summary,
      eventBannerUrl: event.bannerUrl || null,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      eventVenue: event.venue,
      eventMode: event.mode,
      eventCategory: event.category,
      studentId: user.uid,
      studentName: user.name,
      studentEmail: user.email,
      studentRollId: user.studentId || null,
      studentDepartment: user.department || null,
      studentPhone: user.phone || null,
      status: REGISTRATION_STATUS.CONFIRMED,
      notes: notes || null,
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    tx.set(regRef, payload);
    tx.update(eventRef, {
      registeredCount: confirmedCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      registrationId: regId,
      eventTitle: event.title as string,
      reactivated: existingRegSnap.exists,
    };
  });

  await recordUserActivity(
    user.uid,
    "EVENT_REGISTERED",
    `Registered for event: ${result.eventTitle}`,
    { eventId, registrationId: result.registrationId }
  );

  await logAudit({
    action: "EVENT_REGISTRATION",
    entityType: "EventRegistration",
    entityId: result.registrationId,
    details: {
      eventId,
      eventTitle: result.eventTitle,
      studentEmail: user.email,
      reactivated: result.reactivated,
    },
    userId: user.uid,
    userEmail: user.email,
  });

  return result;
}

export async function getStudentRegistrations(studentUid: string) {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const snap = await db
    .collection("eventRegistrations")
    .where("studentId", "==", studentUid)
    .orderBy("registeredAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return toSerializable<any>({
      id: doc.id,
      ...d,
      event: {
        id: d.eventId,
        slug: d.eventSlug,
        title: d.eventTitle,
        summary: d.eventSummary || "",
        bannerUrl: d.eventBannerUrl || null,
        startDate: d.eventStartDate,
        endDate: d.eventEndDate,
        venue: d.eventVenue,
        mode: d.eventMode,
        category: d.eventCategory,
      },
    });
  });
}

export async function getStudentRegistrationForEvent(eventId: string, studentUid: string) {
  if (!isFirebaseAdminConfigured()) return null;

  const db = getAdminDb();
  const regId = `${eventId}_${studentUid}`;
  const snap = await db.collection("eventRegistrations").doc(regId).get();
  if (!snap.exists) return null;

  return toSerializable<any>({ id: snap.id, ...snap.data() });
}

export async function getAllRegistrations(limitCount = 50) {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const snap = await db
    .collection("eventRegistrations")
    .orderBy("registeredAt", "desc")
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return toSerializable<any>({
      id: doc.id,
      ...d,
      event: {
        id: d.eventId,
        title: d.eventTitle,
        slug: d.eventSlug,
        startDate: d.eventStartDate,
      },
      student: {
        id: d.studentId,
        name: d.studentName,
        email: d.studentEmail,
        studentId: d.studentRollId,
        department: d.studentDepartment,
        phone: d.studentPhone,
      },
    });
  });
}
