import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue, Timestamp } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { eventSchema, eventStatusUpdateSchema } from "@/lib/validators";
import { ROLES, PUBLISH_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { getAllEvents } from "@/services/eventService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status") || undefined;

    const user = await getCurrentUser();
    const isStaff = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.COORDINATOR;

    const statusFilter = isStaff && statusParam ? statusParam : PUBLISH_STATUS.PUBLISHED;
    const events = await getAllEvents(statusFilter, mode, category, search);

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("[Events GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: Only coordinators and administrators can create events." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getAdminDb();

    // Check slug uniqueness
    const existingSlug = await db
      .collection("events")
      .where("slug", "==", data.slug)
      .limit(1)
      .get();

    if (!existingSlug.empty) {
      return NextResponse.json(
        { error: "An event with this URL slug already exists. Please modify the slug." },
        { status: 409 }
      );
    }

    const docRef = db.collection("events").doc();
    const payload = {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      description: data.description,
      bannerUrl: data.bannerUrl || null,
      mode: data.mode,
      venue: data.venue,
      locationUrl: data.locationUrl || null,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      registrationDeadline: Timestamp.fromDate(new Date(data.registrationDeadline)),
      capacity: data.capacity,
      registeredCount: 0,
      status: data.status,
      isRegistrationOpen: data.isRegistrationOpen,
      category: data.category,
      createdById: user.uid,
      createdByName: user.name,
      createdByEmail: user.email,
      createdByRole: user.role,
      updatedById: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    await logAudit({
      action: "EVENT_CREATE",
      entityType: "Event",
      entityId: docRef.id,
      details: { title: data.title, slug: data.slug, createdBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    const createdSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      event: toSerializable({
        id: docRef.id,
        ...createdSnap.data(),
        _count: { registrations: 0 },
        createdBy: { name: user.name, email: user.email },
      }),
    });
  } catch (error) {
    console.error("[Events POST Error]", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const parsed = eventSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getAdminDb();

    const collisionSnap = await db
      .collection("events")
      .where("slug", "==", data.slug)
      .get();

    const hasCollision = collisionSnap.docs.some((doc) => doc.id !== id);
    if (hasCollision) {
      return NextResponse.json(
        { error: "Another event already has this slug." },
        { status: 409 }
      );
    }

    const docRef = db.collection("events").doc(id);
    const currentSnap = await docRef.get();
    if (!currentSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await docRef.update({
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      description: data.description,
      bannerUrl: data.bannerUrl || null,
      mode: data.mode,
      venue: data.venue,
      locationUrl: data.locationUrl || null,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      registrationDeadline: Timestamp.fromDate(new Date(data.registrationDeadline)),
      capacity: data.capacity,
      status: data.status,
      isRegistrationOpen: data.isRegistrationOpen,
      category: data.category,
      updatedById: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "EVENT_UPDATE",
      entityType: "Event",
      entityId: id,
      details: { title: data.title, updatedBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data()!;
    return NextResponse.json({
      success: true,
      event: toSerializable({
        id,
        ...updatedData,
        _count: { registrations: Number(updatedData.registeredCount || 0) },
      }),
    });
  } catch (error) {
    console.error("[Events PUT Error]", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = eventStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { id, status, isRegistrationOpen } = parsed.data;
    const db = getAdminDb();
    const docRef = db.collection("events").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const currentData = snap.data()!;
    const nextRegistrationOpen =
      typeof isRegistrationOpen === "boolean"
        ? isRegistrationOpen
        : status === PUBLISH_STATUS.PUBLISHED
        ? currentData.isRegistrationOpen ?? true
        : false;

    await docRef.update({
      status,
      isRegistrationOpen: nextRegistrationOpen,
      updatedById: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "EVENT_STATUS_UPDATED",
      entityType: "Event",
      entityId: id,
      details: {
        title: currentData.title,
        previousStatus: currentData.status,
        newStatus: status,
        updatedBy: user.email,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data()!;
    return NextResponse.json({
      success: true,
      event: toSerializable({
        id,
        ...updatedData,
        _count: { registrations: Number(updatedData.registeredCount || 0) },
      }),
    });
  } catch (error) {
    console.error("[Events PATCH Error]", error);
    return NextResponse.json({ error: "Failed to update event status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can permanently delete events." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    let confirmWithRegistrations = searchParams.get("confirmWithRegistrations") === "true";

    if (!confirmWithRegistrations) {
      try {
        const body = await req.json();
        if (body && body.confirmWithRegistrations === true) {
          confirmWithRegistrations = true;
        }
      } catch {
        // Optional body may be absent on standard DELETE calls
      }
    }

    if (!id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("events").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const title = snap.data()?.title || id;

    // Count ALL associated registrations (Confirmed, Cancelled, Attended)
    const regsSnap = await db
      .collection("eventRegistrations")
      .where("eventId", "==", id)
      .get();

    const registrationCount = regsSnap.size;
    if (registrationCount > 0 && !confirmWithRegistrations) {
      return NextResponse.json(
        {
          error: `Event "${title}" has ${registrationCount} existing registration record(s). Archiving is recommended. Confirm cascade deletion explicitly to remove the event and its registrations.`,
          requiresRegistrationConfirmation: true,
          registrationCount,
          eventTitle: title,
        },
        { status: 409 }
      );
    }

    // Cascade delete event and all associated registrations in batches (<= 450 writes/batch)
    const deleteRefs: FirebaseFirestore.DocumentReference[] = [
      docRef,
      ...regsSnap.docs.map((d) => d.ref),
    ];

    for (let i = 0; i < deleteRefs.length; i += 450) {
      const batch = db.batch();
      for (const ref of deleteRefs.slice(i, i + 450)) {
        batch.delete(ref);
      }
      await batch.commit();
    }

    await logAudit({
      action: "EVENT_DELETE",
      entityType: "Event",
      entityId: id,
      details: {
        title,
        deletedRegistrationsCount: registrationCount,
        deletedBy: user.email,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      deletedEventId: id,
      deletedRegistrationsCount: registrationCount,
      message:
        registrationCount > 0
          ? `Event "${title}" and ${registrationCount} registration record(s) permanently deleted.`
          : `Event "${title}" permanently deleted.`,
    });
  } catch (error) {
    console.error("[Events DELETE Error]", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
