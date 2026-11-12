import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { resourceSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { getResources } from "@/services/siteService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const resources = await getResources();
    return NextResponse.json({ success: true, resources });
  } catch {
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = resourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = await db.collection("resources").add({
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "RESOURCE_CREATE",
      entityType: "Resource",
      entityId: docRef.id,
      details: { title: parsed.data.title },
      userId: user.uid,
      userEmail: user.email,
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      resource: toSerializable({ id: docRef.id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const parsed = resourceSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("resources").doc(id);
    const currentSnap = await docRef.get();
    if (!currentSnap.exists) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await docRef.update({
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "RESOURCE_UPDATE",
      entityType: "Resource",
      entityId: id,
      details: {
        title: parsed.data.title,
        category: parsed.data.category,
        isPublished: parsed.data.isPublished,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      resource: toSerializable({ id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getAdminDb();
    await db.collection("resources").doc(id).delete();

    await logAudit({
      action: "RESOURCE_DELETE",
      entityType: "Resource",
      entityId: id,
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, message: "Resource removed" });
  } catch {
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
