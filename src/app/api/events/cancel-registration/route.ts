import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, REGISTRATION_STATUS } from "@/lib/constants";
import { logAudit, recordUserActivity } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (user.role === ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: Coordinators do not have permission to manage registrations." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
    }

    const db = getAdminDb();

    const cancelledInfo = await db.runTransaction(async (tx) => {
      const regRef = db.collection("eventRegistrations").doc(registrationId);
      const regSnap = await tx.get(regRef);

      if (!regSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const regData = regSnap.data()!;

      if (user.role === ROLES.STUDENT && regData.studentId !== user.uid) {
        throw new Error("FORBIDDEN");
      }

      const eventRef = db.collection("events").doc(regData.eventId);
      const eventSnap = await tx.get(eventRef);

      tx.update(regRef, {
        status: REGISTRATION_STATUS.CANCELLED,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (eventSnap.exists && regData.status === REGISTRATION_STATUS.CONFIRMED) {
        const currentCount = Number(eventSnap.data()?.registeredCount || 0);
        tx.update(eventRef, {
          registeredCount: Math.max(0, currentCount - 1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return regData;
    });

    await recordUserActivity(
      cancelledInfo.studentId,
      "EVENT_CANCELLED",
      `Cancelled registration for: ${cancelledInfo.eventTitle}`,
      { registrationId, eventId: cancelledInfo.eventId }
    );

    await logAudit({
      action: "REGISTRATION_CANCELLED",
      entityType: "EventRegistration",
      entityId: registrationId,
      details: {
        eventId: cancelledInfo.eventId,
        studentId: cancelledInfo.studentId,
        cancelledBy: user.email,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Registration cancelled successfully.",
    });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }
    if (code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Forbidden: You can only cancel your own registration." },
        { status: 403 }
      );
    }
    console.error("[Cancel Registration Error]", error);
    return NextResponse.json({ error: "Failed to cancel registration." }, { status: 500 });
  }
}
