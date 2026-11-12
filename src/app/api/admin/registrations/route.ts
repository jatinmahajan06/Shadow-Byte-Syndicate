import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, REGISTRATION_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can view registration lists." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    const db = getAdminDb();
    let q = db.collection("eventRegistrations") as FirebaseFirestore.Query;
    if (eventId) q = q.where("eventId", "==", eventId);
    if (status && status !== "ALL") q = q.where("status", "==", status);

    const snap = await q.orderBy("registeredAt", "desc").get().catch(async () => {
      return db.collection("eventRegistrations").orderBy("registeredAt", "desc").get();
    });

    let registrations = snap.docs.map((doc) => {
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

    if (eventId) registrations = registrations.filter((r) => r.eventId === eventId);
    if (status && status !== "ALL") registrations = registrations.filter((r) => r.status === status);

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error("[Admin Registrations GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminDb();

    const updatedData = await db.runTransaction(async (tx) => {
      const regRef = db.collection("eventRegistrations").doc(id);
      const regSnap = await tx.get(regRef);
      if (!regSnap.exists) throw new Error("NOT_FOUND");

      const current = regSnap.data()!;
      const eventRef = db.collection("events").doc(current.eventId);
      const eventSnap = await tx.get(eventRef);

      tx.update(regRef, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (eventSnap.exists) {
        let delta = 0;
        if (current.status !== REGISTRATION_STATUS.CONFIRMED && status === REGISTRATION_STATUS.CONFIRMED) {
          delta = 1;
        } else if (
          current.status === REGISTRATION_STATUS.CONFIRMED &&
          status !== REGISTRATION_STATUS.CONFIRMED
        ) {
          delta = -1;
        }
        if (delta !== 0) {
          const curCount = Number(eventSnap.data()?.registeredCount || 0);
          tx.update(eventRef, {
            registeredCount: Math.max(0, curCount + delta),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      return current;
    });

    await logAudit({
      action: "REGISTRATION_STATUS_UPDATED",
      entityType: "EventRegistration",
      entityId: id,
      details: {
        newStatus: status,
        event: updatedData.eventTitle,
        student: updatedData.studentEmail,
        updatedBy: user.email,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Registrations PUT Error]", error);
    return NextResponse.json({ error: "Failed to update registration status" }, { status: 500 });
  }
}
