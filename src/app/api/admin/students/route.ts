import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, UserRole } from "@/lib/constants";
import { listUsersByRole, updateUserRoleAndStatus } from "@/services/userService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const users = await listUsersByRole(undefined, search);
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
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, isActive, role } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (role && !Object.values(ROLES).includes(role as UserRole)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const updated = await updateUserRoleAndStatus(
      id,
      {
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        role: role as UserRole | undefined,
      },
      currentUser
    );

    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (msg === "LAST_SUPER_ADMIN_PROTECTION") {
      return NextResponse.json(
        {
          error:
            "Security Policy Violation: Cannot demote or deactivate the last active Super Admin account. At least one active Super Admin must always exist.",
        },
        { status: 400 }
      );
    }
    console.error("[Admin Students PUT Error]", error);
    return NextResponse.json({ error: "Failed to update user account" }, { status: 500 });
  }
}
