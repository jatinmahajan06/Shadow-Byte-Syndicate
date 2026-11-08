import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, UserRole } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { studentId: { contains: search } },
        { department: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        studentId: true,
        department: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("[Admin Students GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch student accounts" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive, role } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // CRITICAL SECURITY INVARIANT:
    // Protect against deleting, demoting, or deactivating the last active Super Admin!
    if (targetUser.role === ROLES.SUPER_ADMIN) {
      const isDemoting = role && role !== ROLES.SUPER_ADMIN;
      const isDeactivating = isActive === false;

      if (isDemoting || isDeactivating) {
        const activeSuperAdminCount = await prisma.user.count({
          where: {
            role: ROLES.SUPER_ADMIN,
            isActive: true,
          },
        });

        if (activeSuperAdminCount <= 1) {
          return NextResponse.json(
            {
              error:
                "Security Policy Violation: Cannot demote or deactivate the last active Super Admin account. At least one active Super Admin must always exist.",
            },
            { status: 400 }
          );
        }
      }
    }

    const updateData: any = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (role && Object.values(ROLES).includes(role as UserRole)) updateData.role = role;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (isActive === false) {
      // Invalidate active sessions immediately
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await logAudit({
      action: "USER_STATUS_OR_ROLE_MODIFIED",
      entityType: "User",
      entityId: id,
      details: {
        targetEmail: targetUser.email,
        updatedFields: updateData,
        modifiedBy: currentUser.email,
      },
      userId: currentUser.id,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[Admin Students PUT Error]", error);
    return NextResponse.json({ error: "Failed to update user account" }, { status: 500 });
  }
}
