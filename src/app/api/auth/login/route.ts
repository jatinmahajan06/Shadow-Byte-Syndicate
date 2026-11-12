import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, FieldValue } from "@/firebase/admin";
import { createFirebaseSessionCookie, getRoleDashboardPath } from "@/lib/auth";
import { firebaseLoginSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, recordUserActivity } from "@/lib/audit";
import { UserRole } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const limiter = rateLimit(`login:${ip}`, 10, 60);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${limiter.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = firebaseLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid authentication payload: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { idToken, expectedRole } = parsed.data;
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "Account profile not found. Please sign up or contact administration." },
        { status: 401 }
      );
    }

    const userData = userSnap.data()!;

    if (userData.isActive === false) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact administration." },
        { status: 403 }
      );
    }

    // Strict Portal Role Enforcement
    if (userData.role !== expectedRole) {
      await logAudit({
        action: "PORTAL_ROLE_MISMATCH",
        entityType: "User",
        entityId: uid,
        details: {
          userEmail: userData.email,
          actualRole: userData.role,
          attemptedPortalRole: expectedRole,
        },
        userId: uid,
        userEmail: userData.email,
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

    // Ensure Firebase Custom Claims stay synchronized with Firestore role
    await adminAuth.setCustomUserClaims(uid, {
      role: userData.role,
      isActive: true,
    });

    await userRef.update({
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    await createFirebaseSessionCookie(idToken);

    await recordUserActivity(
      uid,
      "LOGIN_SUCCESS",
      `Authenticated via ${expectedRole} portal.`
    );

    await logAudit({
      action: "USER_LOGIN_SUCCESS",
      entityType: "User",
      entityId: uid,
      details: { role: userData.role, email: userData.email },
      userId: uid,
      userEmail: userData.email,
      ipAddress: ip,
    });

    const userRole = userData.role as UserRole;

    return NextResponse.json({
      success: true,
      user: {
        id: uid,
        uid,
        email: userData.email,
        name: userData.name,
        role: userRole,
        isActive: true,
        studentId: userData.studentId || null,
        department: userData.department || null,
      },
      redirectUrl: getRoleDashboardPath(userRole),
    });
  } catch (error) {
    console.error("[Firebase Auth Login Error]", error);
    return NextResponse.json(
      { error: "Invalid credentials or session expired." },
      { status: 401 }
    );
  }
}
