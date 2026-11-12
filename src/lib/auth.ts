import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/firebase/admin";
import { ROLES, UserRole } from "./constants";

export const SESSION_COOKIE_NAME = "sbs_firebase_session";
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  studentId: string | null;
  department: string | null;
  phone?: string | null;
  photoURL?: string | null;
}

/**
 * Exchanges a verified Firebase Auth ID token for a secure HTTP-only Firebase Session Cookie.
 */
export async function createFirebaseSessionCookie(idToken: string) {
  const adminAuth = getAdminAuth();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });

  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return sessionCookie;
}

/**
 * Clears the HTTP-only session cookie and optionally revokes refresh tokens.
 */
export async function destroySession(uid?: string) {
  if (uid && isFirebaseAdminConfigured()) {
    try {
      await getAdminAuth().revokeRefreshTokens(uid);
    } catch {
      // Non-fatal if user doesn't exist or emulator restarted
    }
  }

  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Verifies the Firebase session cookie on the server, fetches fresh user profile
 * from Cloud Firestore `users/{uid}`, and guarantees account is active.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (!isFirebaseAdminConfigured()) return null;

    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify cookie and ensure tokens haven't been revoked
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    if (!uid) return null;

    // Strict freshness: Check Firestore profile directly
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    if (data.isActive === false) {
      return null;
    }

    return {
      id: uid,
      uid,
      email: data.email || decoded.email || "",
      name: data.name || decoded.name || "User",
      role: (data.role || ROLES.STUDENT) as UserRole,
      isActive: data.isActive !== false,
      studentId: data.studentId || null,
      department: data.department || null,
      phone: data.phone || null,
      photoURL: data.photoURL || null,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "/admin";
    case ROLES.COORDINATOR:
      return "/coordinator";
    case ROLES.STUDENT:
      return "/student";
    default:
      return "/";
  }
}
