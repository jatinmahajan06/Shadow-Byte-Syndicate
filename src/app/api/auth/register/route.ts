import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, FieldValue } from "@/firebase/admin";
import { createFirebaseSessionCookie } from "@/lib/auth";
import { firebaseStudentRegisterSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, recordUserActivity } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const limiter = rateLimit(`register:${ip}`, 5, 300);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: `Registration rate limit reached. Please retry in ${limiter.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = firebaseStudentRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { idToken, name, studentId, department, phone } = parsed.data;
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    // Verify Firebase ID token server-side
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Verified email address is required." },
        { status: 400 }
      );
    }

    const userRef = db.collection("users").doc(uid);
    const existingSnap = await userRef.get();

    if (existingSnap.exists) {
      return NextResponse.json(
        { error: "An account profile already exists for this identity. Please log in." },
        { status: 409 }
      );
    }

    // SECURITY ENFORCEMENT: Public registration strictly enforces ROLES.STUDENT
    await adminAuth.setCustomUserClaims(uid, {
      role: ROLES.STUDENT,
      isActive: true,
    });

    await userRef.set({
      uid,
      email,
      name: name.trim(),
      role: ROLES.STUDENT,
      isActive: true,
      studentId: studentId.trim(),
      department: department.trim(),
      phone: phone?.trim() || null,
      photoURL: decoded.picture || null,
      preferences: {
        notifications: true,
        theme: "dark",
      },
      registrationCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await createFirebaseSessionCookie(idToken);

    await recordUserActivity(
      uid,
      "ACCOUNT_CREATED",
      "Collegiate student account provisioned with Shadow Byte Syndicate."
    );

    await logAudit({
      action: "STUDENT_SIGNUP",
      entityType: "User",
      entityId: uid,
      details: { email, studentId, provider: "password" },
      userId: uid,
      userEmail: email,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Student account created successfully.",
      user: {
        id: uid,
        uid,
        email,
        name: name.trim(),
        role: ROLES.STUDENT,
        isActive: true,
        studentId: studentId.trim(),
        department: department.trim(),
      },
      redirectUrl: "/student",
    });
  } catch (error) {
    console.error("[Firebase Student Register API Error]", error);
    return NextResponse.json(
      { error: "Failed to create student account. Please try again." },
      { status: 500 }
    );
  }
}
