import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getStudentRegistrations } from "@/services/eventService";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.STUDENT) {
      return NextResponse.json(
        { error: "Forbidden: This endpoint is restricted to student accounts." },
        { status: 403 }
      );
    }

    // STRICT STUDENT ISOLATION: Query ONLY with studentId === user.uid
    const registrations = await getStudentRegistrations(user.uid);

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error("[Student Registrations GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}
