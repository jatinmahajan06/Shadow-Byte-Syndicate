import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { getSiteSettings } from "@/services/siteService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const settings = await getSiteSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[Site Settings GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
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

    const db = getAdminDb();
    const ref = db.collection("siteSettings").doc("default");

    await ref.set(
      {
        ...parsed.data,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await logAudit({
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteSettings",
      entityId: "default",
      details: { updatedBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    const updatedSnap = await ref.get();
    return NextResponse.json({
      success: true,
      settings: toSerializable({ id: "default", ...updatedSnap.data() }),
    });
  } catch (error) {
    console.error("[Site Settings PUT Error]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
