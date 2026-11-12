import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getContactMessages } from "@/services/siteService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const messages = await getContactMessages();
    return NextResponse.json({ success: true, messages });
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isRead } = body;

    const db = getAdminDb();
    const docRef = db.collection("contactMessages").doc(id);
    await docRef.update({
      isRead: Boolean(isRead),
      respondedAt: isRead ? FieldValue.serverTimestamp() : null,
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      message: toSerializable({ id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
