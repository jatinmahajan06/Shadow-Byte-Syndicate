import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { coordinatorCreateSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    const coordinators = await prisma.user.findMany({
      where: { role: ROLES.COORDINATOR },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            createdEvents: true,
            createdPosts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, coordinators });
  } catch (error) {
    console.error("[Admin Coordinators GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch coordinators" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = coordinatorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { name, email, password, department, phone } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const coordinator = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: ROLES.COORDINATOR,
        isActive: true,
        department: department || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });

    await logAudit({
      action: "COORDINATOR_CREATED",
      entityType: "User",
      entityId: coordinator.id,
      details: { email: coordinator.email, createdBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, coordinator });
  } catch (error) {
    console.error("[Admin Coordinators POST Error]", error);
    return NextResponse.json({ error: "Failed to create coordinator account." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const coordinator = await prisma.user.findUnique({ where: { id } });
    if (!coordinator || coordinator.role !== ROLES.COORDINATOR) {
      return NextResponse.json({ error: "Coordinator account not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // Invalidate active sessions if deactivated
    if (!isActive) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await logAudit({
      action: isActive ? "COORDINATOR_ACTIVATED" : "COORDINATOR_DEACTIVATED",
      entityType: "User",
      entityId: id,
      details: { email: coordinator.email, updatedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, coordinator: updated });
  } catch (error) {
    console.error("[Admin Coordinators PUT Error]", error);
    return NextResponse.json({ error: "Failed to update coordinator status" }, { status: 500 });
  }
}
