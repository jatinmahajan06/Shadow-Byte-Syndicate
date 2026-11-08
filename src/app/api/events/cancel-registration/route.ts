import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, REGISTRATION_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    if (!reg) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    // OWNERSHIP CHECK: Students can only cancel their own registration
    if (user.role === ROLES.STUDENT && reg.studentId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only cancel your own registration." },
        { status: 403 }
      );
    }

    // Coordinators cannot manage student registrations
    if (user.role === ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: Coordinators do not have permission to manage registrations." },
        { status: 403 }
      );
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: REGISTRATION_STATUS.CANCELLED },
    });

    await logAudit({
      action: "REGISTRATION_CANCELLED",
      entityType: "EventRegistration",
      entityId: registrationId,
      details: {
        eventId: reg.eventId,
        studentId: reg.studentId,
        cancelledBy: user.email,
      },
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Registration cancelled successfully.",
      registration: updated,
    });
  } catch (error) {
    console.error("[Cancel Registration Error]", error);
    return NextResponse.json({ error: "Failed to cancel registration." }, { status: 500 });
  }
}
