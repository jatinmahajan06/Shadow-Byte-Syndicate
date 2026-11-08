import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[Site Settings GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // STRICT CHECK: Coordinators CANNOT edit site settings or branding!
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can modify site settings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = siteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...parsed.data,
      },
      update: {
        ...parsed.data,
      },
    });

    await logAudit({
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteSettings",
      entityId: "default",
      details: { updatedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("[Site Settings PUT Error]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
