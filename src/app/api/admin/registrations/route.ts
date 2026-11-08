import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, REGISTRATION_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // STRICT SECURITY: Only Super Admin can access registration personal lists
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can view registration lists." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (status && status !== "ALL") where.status = status;

    const registrations = await prisma.eventRegistration.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            capacity: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            department: true,
            phone: true,
          },
        },
      },
      orderBy: { registeredAt: "desc" },
    });

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

    const updated = await prisma.eventRegistration.update({
      where: { id },
      data: { status },
      include: {
        event: { select: { title: true } },
        student: { select: { email: true } },
      },
    });

    await logAudit({
      action: "REGISTRATION_STATUS_UPDATED",
      entityType: "EventRegistration",
      entityId: id,
      details: {
        newStatus: status,
        event: updated.event.title,
        student: updated.student.email,
        updatedBy: user.email,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error("[Admin Registrations PUT Error]", error);
    return NextResponse.json({ error: "Failed to update registration status" }, { status: 500 });
  }
}
