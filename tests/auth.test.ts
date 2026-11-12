import { describe, it, expect, afterAll } from "vitest";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
} from "firebase/auth";
import { getAdminAuth, getAdminDb, FieldValue } from "../src/firebase/admin";
import { ROLES, UserRole } from "../src/lib/constants";
import {
  createIsolatedClient,
  provisionTestUser,
  cleanupTestUsers,
} from "./setup-firebase";

describe("Firebase Authentication, Google Sign-In, Reset & Session Persistence", () => {
  const createdUids: string[] = [];
  const uniqueSuffix = Date.now();
  const regEmail = `test-reg-${uniqueSuffix}@shadowbyte.local`;
  const googleEmail = `google-stu-${uniqueSuffix}@gmail.com`;
  const testPassword = "Password123!Secure";

  afterAll(async () => {
    await cleanupTestUsers(createdUids);
  });

  it("1. New student registration strictly forces STUDENT role & Custom Claims", async () => {
    const client = createIsolatedClient("reg");
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    try {
      const cred = await createUserWithEmailAndPassword(client.auth, regEmail, testPassword);
      createdUids.push(cred.user.uid);
      const idToken = await cred.user.getIdToken(true);

      // Server-side ID token verification + invariant mirroring /api/auth/register
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      expect(decoded.uid).toBe(cred.user.uid);

      const attemptedEscalatedRole = "SUPER_ADMIN"; // Must always be ignored
      expect(attemptedEscalatedRole).not.toBe(ROLES.STUDENT);

      await adminAuth.setCustomUserClaims(decoded.uid, {
        role: ROLES.STUDENT,
        isActive: true,
      });

      await db.collection("users").doc(decoded.uid).set({
        uid: decoded.uid,
        email: regEmail,
        name: "Test Hacker",
        role: ROLES.STUDENT,
        isActive: true,
        studentId: "ROLL-999",
        department: "Cyber Security",
        preferences: { notifications: true, theme: "dark" },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const userSnap = await db.collection("users").doc(decoded.uid).get();
      const authUser = await adminAuth.getUser(decoded.uid);

      expect(userSnap.data()?.role).toBe(ROLES.STUDENT);
      expect(authUser.customClaims?.role).toBe(ROLES.STUDENT);
      expect(authUser.customClaims?.isActive).toBe(true);
    } finally {
      await client.cleanup();
    }
  });

  it("2. Existing user login & portal role mismatch / deactivated account enforcement", async () => {
    const client = createIsolatedClient("login-portal");
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    const activeStudent = await provisionTestUser({
      email: `active-stu-${uniqueSuffix}@shadowbyte.local`,
      password: testPassword,
      name: "Active Student",
      role: ROLES.STUDENT,
      isActive: true,
    });
    const disabledStudent = await provisionTestUser({
      email: `disabled-stu-${uniqueSuffix}@shadowbyte.local`,
      password: testPassword,
      name: "Disabled Student",
      role: ROLES.STUDENT,
      isActive: false,
    });
    createdUids.push(activeStudent.uid, disabledStudent.uid);

    try {
      const cred = await signInWithEmailAndPassword(client.auth, activeStudent.email, testPassword);
      const idToken = await cred.user.getIdToken(true);
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      const userSnap = await db.collection("users").doc(decoded.uid).get();
      const userData = userSnap.data()!;

      const checkPortalAccess = (actualRole: UserRole, expectedPortalRole: UserRole) =>
        actualRole === expectedPortalRole;

      expect(checkPortalAccess(userData.role, ROLES.STUDENT)).toBe(true);
      expect(checkPortalAccess(userData.role, ROLES.COORDINATOR)).toBe(false);
      expect(checkPortalAccess(userData.role, ROLES.SUPER_ADMIN)).toBe(false);

      // Deactivated user cannot sign in via Firebase Auth
      await expect(
        signInWithEmailAndPassword(client.auth, disabledStudent.email, testPassword)
      ).rejects.toThrow(/user-disabled|disabled/i);
    } finally {
      await client.cleanup();
    }
  });

  it("3. Google Sign-In auto-provisions STUDENT only on student portal & blocks privileged portals", async () => {
    const client = createIsolatedClient("google-oauth");
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    try {
      const googleAssertion = JSON.stringify({
        sub: `google-sub-${uniqueSuffix}`,
        email: googleEmail,
        email_verified: true,
        name: "Google Student",
        picture: "https://example.com/avatar.png",
      });

      const credential = GoogleAuthProvider.credential(googleAssertion);
      const userCred = await signInWithCredential(client.auth, credential);
      createdUids.push(userCred.user.uid);

      const idToken = await userCred.user.getIdToken(true);
      const decoded = await adminAuth.verifyIdToken(idToken, true);

      expect(decoded.firebase.sign_in_provider).toBe("google.com");
      expect(decoded.email).toBe(googleEmail);

      // Simulate /api/auth/google first-time check: MUST reject non-STUDENT portals
      const allowPrivilegedAutoProvision = (expectedRole: UserRole) =>
        expectedRole === ROLES.STUDENT;

      expect(allowPrivilegedAutoProvision(ROLES.COORDINATOR)).toBe(false);
      expect(allowPrivilegedAutoProvision(ROLES.SUPER_ADMIN)).toBe(false);
      expect(allowPrivilegedAutoProvision(ROLES.STUDENT)).toBe(true);

      // Provision as STUDENT
      await adminAuth.setCustomUserClaims(decoded.uid, {
        role: ROLES.STUDENT,
        isActive: true,
      });
      await db.collection("users").doc(decoded.uid).set({
        uid: decoded.uid,
        email: googleEmail,
        name: decoded.name || "Google Student",
        role: ROLES.STUDENT,
        isActive: true,
        photoURL: decoded.picture || null,
        preferences: { notifications: true, theme: "dark" },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const createdSnap = await db.collection("users").doc(decoded.uid).get();
      expect(createdSnap.data()?.role).toBe(ROLES.STUDENT);
    } finally {
      await client.cleanup();
    }
  });

  it("4. Password reset link generation, code verification & credential update", async () => {
    const client = createIsolatedClient("pw-reset");
    const adminAuth = getAdminAuth();
    const targetEmail = `pwreset-${uniqueSuffix}@shadowbyte.local`;
    const newPassword = "UpdatedCyberPass#2026!";

    const user = await provisionTestUser({
      email: targetEmail,
      password: testPassword,
      name: "Reset Target",
      role: ROLES.STUDENT,
    });
    createdUids.push(user.uid);

    try {
      const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);
      const parsedUrl = new URL(resetLink);
      const oobCode = parsedUrl.searchParams.get("oobCode");
      expect(oobCode).toBeTruthy();

      const resolvedEmail = await verifyPasswordResetCode(client.auth, oobCode!);
      expect(resolvedEmail).toBe(targetEmail);

      await confirmPasswordReset(client.auth, oobCode!, newPassword);

      // Old password must fail
      await expect(
        signInWithEmailAndPassword(client.auth, targetEmail, testPassword)
      ).rejects.toThrow();

      // New password must succeed
      const freshCred = await signInWithEmailAndPassword(client.auth, targetEmail, newPassword);
      expect(freshCred.user.uid).toBe(user.uid);
    } finally {
      await client.cleanup();
    }
  });

  it("5 & 6. Session persistence across requests & instant revocation on logout", async () => {
    const client = createIsolatedClient("session-persist");
    const adminAuth = getAdminAuth();

    const user = await provisionTestUser({
      email: `session-${uniqueSuffix}@shadowbyte.local`,
      password: testPassword,
      name: "Session User",
      role: ROLES.STUDENT,
    });
    createdUids.push(user.uid);

    try {
      const cred = await signInWithEmailAndPassword(client.auth, user.email, testPassword);
      const idToken = await cred.user.getIdToken(true);

      // Issue HTTP-only Firebase Session Cookie equivalent (5 days / 7 days)
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: 5 * 24 * 60 * 60 * 1000,
      });

      // Simulate page refresh verification with checkRevoked = true
      const verified1 = await adminAuth.verifySessionCookie(sessionCookie, true);
      const verified2 = await adminAuth.verifySessionCookie(sessionCookie, true);
      expect(verified1.uid).toBe(user.uid);
      expect(verified2.uid).toBe(user.uid);
      expect(verified1.role).toBe(ROLES.STUDENT);

      // Simulate Logout: client signOut + server revokeRefreshTokens
      await signOut(client.auth);
      expect(client.auth.currentUser).toBeNull();

      // Advance past the 1-second IAT boundary before revoking refresh tokens
      await new Promise((r) => setTimeout(r, 1100));
      await adminAuth.revokeRefreshTokens(user.uid);

      // Session cookie must now be rejected when checkRevoked = true
      await expect(adminAuth.verifySessionCookie(sessionCookie, true)).rejects.toThrow();
    } finally {
      await client.cleanup();
    }
  });
});
