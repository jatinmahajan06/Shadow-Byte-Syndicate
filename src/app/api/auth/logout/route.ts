import { NextResponse } from "next/server";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      action: "USER_LOGOUT",
      entityType: "User",
      entityId: user.uid,
      details: { email: user.email },
      userId: user.uid,
      userEmail: user.email,
    });
  }

  await destroySession(user?.uid);
  return NextResponse.json({ success: true, message: "Signed out successfully." });
}
