import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
      photoURL: user.photoURL || null,
    },
  });
}
