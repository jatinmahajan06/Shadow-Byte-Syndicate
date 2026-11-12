import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getAuditLogs } from "@/services/siteService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const logs = await getAuditLogs(search, 100);
    return NextResponse.json({ success: true, logs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
