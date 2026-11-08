import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, getRoleDashboardPath } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { ROLES, UserRole } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // Rate limit: 5 login attempts per IP per minute
    const limiter = rateLimit(`login:${ip}`, 5, 60);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${limiter.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { email, password, expectedRole } = parsed.data;

    // Generic error response to prevent user enumeration
    const genericAuthError = "Invalid email, password, or unauthorized for this portal.";

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: genericAuthError }, { status: 401 });
    }

    // Check password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: genericAuthError }, { status: 401 });
    }

    // Strict account status check
    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact administration." },
        { status: 403 }
      );
    }

    // STRICT ROLE PORTAL ENFORCEMENT:
    // A user must never gain access by selecting the wrong login page.
    // If a user with role STUDENT tries to login on /login/coordinator or /login/super-admin, reject!
    if (user.role !== expectedRole) {
      await logAudit({
        action: "PORTAL_ROLE_MISMATCH",
        entityType: "User",
        entityId: user.id,
        details: {
          userEmail: user.email,
          actualRole: user.role,
          attemptedPortalRole: expectedRole,
        },
        userId: user.id,
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          error: `Access Denied: Your account role does not have authorization to access the ${expectedRole.replace(
            "_",
            " "
          )} portal.`,
        },
        { status: 403 }
      );
    }

    // Create session
    await createSession(user.id, user.role, ip, userAgent);

    await logAudit({
      action: "USER_LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      details: { role: user.role, email: user.email },
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl: getRoleDashboardPath(user.role as UserRole),
    });
  } catch (error: unknown) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred during authentication." },
      { status: 500 }
    );
  }
}
