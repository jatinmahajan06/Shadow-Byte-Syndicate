import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { teamMemberSchema } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { getTeamMembers } from "@/services/siteService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const members = await getTeamMembers();
    return NextResponse.json({ success: true, members });
  } catch {
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = teamMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = await db.collection("teamMembers").add({
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || null,
      email: parsed.data.email || null,
      githubUrl: parsed.data.githubUrl || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "TEAM_MEMBER_CREATE",
      entityType: "TeamMember",
      entityId: docRef.id,
      details: { name: parsed.data.name, role: parsed.data.role },
      userId: user.uid,
      userEmail: user.email,
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      member: toSerializable({ id: docRef.id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
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

    const parsed = teamMemberSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("teamMembers").doc(id);
    await docRef.update({
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || null,
      email: parsed.data.email || null,
      githubUrl: parsed.data.githubUrl || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snap = await docRef.get();
    return NextResponse.json({
      success: true,
      member: toSerializable({ id, ...snap.data() }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
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
    await db.collection("teamMembers").doc(id).delete();

    await logAudit({
      action: "TEAM_MEMBER_DELETE",
      entityType: "TeamMember",
      entityId: id,
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, message: "Team member removed" });
  } catch {
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 });
  }
}
