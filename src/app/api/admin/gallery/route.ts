import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getGalleryItems } from "@/services/siteService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const items = await getGalleryItems();
    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch gallery items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, caption, imageUrl, eventTag, displayOrder } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ error: "Title and Image URL are required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = await db.collection("gallery").add({
      title,
      caption: caption || null,
      imageUrl,
      eventTag: eventTag || null,
      displayOrder: Number(displayOrder) || 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      item: toSerializable({ id: docRef.id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to create gallery item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getAdminDb();
    await db.collection("gallery").doc(id).delete();
    return NextResponse.json({ success: true, message: "Gallery item removed" });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
