import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { coordinatorCreateSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import {
  listUsersByRole,
  createCoordinatorAccount,
  updateUserRoleAndStatus,
} from "@/services/userService";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const coordinators = await listUsersByRole(ROLES.COORDINATOR);
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
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = coordinatorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const coordinator = await createCoordinatorAccount(parsed.data, user);
    return NextResponse.json({ success: true, coordinator });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "EMAIL_EXISTS" || (error as { code?: string })?.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }
    console.error("[Admin Coordinators POST Error]", error);
    return NextResponse.json({ error: "Failed to create coordinator account." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const updated = await updateUserRoleAndStatus(id, { isActive }, user);
    return NextResponse.json({ success: true, coordinator: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Coordinator account not found" }, { status: 404 });
    }
    console.error("[Admin Coordinators PUT Error]", error);
    return NextResponse.json({ error: "Failed to update coordinator status" }, { status: 500 });
  }
}
