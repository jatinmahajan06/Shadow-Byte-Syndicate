import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, FieldValue } from "@/firebase/admin";
import { createFirebaseSessionCookie, getRoleDashboardPath } from "@/lib/auth";
import { firebaseGoogleAuthSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, recordUserActivity } from "@/lib/audit";
import { ROLES, UserRole } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const limiter = rateLimit(`google-auth:${ip}`, 10, 60);
    if (!limiter.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${limiter.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = firebaseGoogleAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Google auth request." },
        { status: 400 }
      );
    }

    const { idToken, expectedRole } = parsed.data;
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Google account must include a verified email address." },
        { status: 400 }
      );
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    // Case 1: Existing account profile
    if (userSnap.exists) {
      const userData = userSnap.data()!;

      if (userData.isActive === false) {
        return NextResponse.json(
          { error: "This account has been deactivated by administration." },
          { status: 403 }
        );
      }

      if (userData.role !== expectedRole) {
        await logAudit({
          action: "GOOGLE_PORTAL_ROLE_MISMATCH",
          entityType: "User",
          entityId: uid,
          details: {
            email,
            actualRole: userData.role,
            attemptedPortal: expectedRole,
          },
          userId: uid,
          userEmail: email,
          ipAddress: ip,
        });

        return NextResponse.json(
          {
            error: `Access Denied: Your account role (${userData.role}) cannot access the ${expectedRole.replace(
              "_",
              " "
            )} portal.`,
          },
          { status: 403 }
        );
      }

      await adminAuth.setCustomUserClaims(uid, {
        role: userData.role,
        isActive: true,
      });

      await userRef.update({
        photoURL: decoded.picture || userData.photoURL || null,
        lastLoginAt: FieldValue.serverTimestamp(),
      });

      await createFirebaseSessionCookie(idToken);
      await recordUserActivity(uid, "GOOGLE_LOGIN", "Signed in using Google OAuth.");

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
          photoURL: decoded.picture || userData.photoURL || null,
        },
        redirectUrl: getRoleDashboardPath(userRole),
      });
    }

    // Case 2: First-time Google Sign-In
    // STRICT SECURITY: Public Google Sign-In can ONLY auto-provision STUDENT accounts!
    if (expectedRole !== ROLES.STUDENT) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: New accounts created via Google Sign-In can only access the Student Portal. Privileged roles must be provisioned by a Super Admin.",
        },
        { status: 403 }
      );
    }

    const displayName = decoded.name || email.split("@")[0];

    await adminAuth.setCustomUserClaims(uid, {
      role: ROLES.STUDENT,
      isActive: true,
    });

    await userRef.set({
      uid,
      email,
      name: displayName,
      role: ROLES.STUDENT,
      isActive: true,
      studentId: null,
      department: null,
      phone: null,
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
      "STUDENT_GOOGLE_SIGNUP",
      "Provisioned collegiate student account via Google Sign-In."
    );
    await logAudit({
      action: "STUDENT_GOOGLE_SIGNUP",
      entityType: "User",
      entityId: uid,
      details: { email, provider: "google.com" },
      userId: uid,
      userEmail: email,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: uid,
        uid,
        email,
        name: displayName,
        role: ROLES.STUDENT,
        isActive: true,
        studentId: null,
        department: null,
        photoURL: decoded.picture || null,
      },
      redirectUrl: "/student",
    });
  } catch (error) {
    console.error("[Google Auth API Error]", error);
    return NextResponse.json(
      { error: "Failed to verify Google authentication." },
      { status: 401 }
    );
  }
}

