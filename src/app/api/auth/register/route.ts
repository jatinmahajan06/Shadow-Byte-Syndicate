import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { studentRegisterSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // Rate limit: 3 registrations per IP per 5 minutes
    const limiter = rateLimit(`register:${ip}`, 3, 300);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: `Registration rate limit reached. Please retry in ${limiter.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = studentRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { name, email, password, studentId, department, phone } = parsed.data;

    // Check if email already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // SECURITY ENFORCEMENT: Explicitly force STUDENT role. No client can escalate role during registration.
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: ROLES.STUDENT,
        isActive: true,
        studentId,
        department,
        phone: phone || null,
      },
    });

    // Create session for immediate student onboarding
    await createSession(newUser.id, newUser.role, ip, userAgent);

    await logAudit({
      action: "STUDENT_SIGNUP",
      entityType: "User",
      entityId: newUser.id,
      details: { email: newUser.email, studentId: newUser.studentId },
      userId: newUser.id,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Student account created successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      redirectUrl: "/student",
    });
  } catch (error: unknown) {
    console.error("[Register API Error]", error);
    return NextResponse.json(
      { error: "Failed to create student account. Please try again." },
      { status: 500 }
    );
  }
}
