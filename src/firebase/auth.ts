"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { getFirebaseClient } from "./config";
import { UserRole } from "@/lib/constants";

export interface AuthSessionResponse {
  success: boolean;
  user: {
    id: string;
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    studentId?: string | null;
    department?: string | null;
    photoURL?: string | null;
  };
  redirectUrl: string;
}

/**
 * Maps raw Firebase Auth error codes into clean, secure messages
 * without leaking whether an account exists during login.
 */
export function formatFirebaseAuthError(error: unknown, genericFallback = "Authentication failed."): string {
  const err = error as { code?: string; message?: string };
  if (!err?.code) {
    return err?.message || genericFallback;
  }

  switch (err.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email, password, or unauthorized for this portal.";
    case "auth/too-many-requests":
      return "Too many authentication attempts. Please wait before trying again.";
    case "auth/user-disabled":
      return "This account has been deactivated. Please contact administration.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please log in.";
    case "auth/weak-password":
      return "Password must be at least 8 characters with strong complexity.";
    case "auth/invalid-email":
      return "Please provide a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing.";
    case "auth/unauthorized-domain":
      return "Current domain is not authorized for Google Sign-In. Add this domain to Firebase Console -> Authentication -> Settings -> Authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in provider is not enabled in Firebase Authentication settings.";
    default:
      return err.message || genericFallback;
  }
}

async function establishServerSession(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<AuthSessionResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Session verification failed.");
  }
  return data;
}

/**
 * Signs in with Email & Password, enforces role on the server portal, and sets session cookie.
 */
export async function loginWithEmailPortal(
  email: string,
  password: string,
  expectedRole: UserRole
): Promise<AuthSessionResponse> {
  const { auth } = getFirebaseClient();
  let credential: UserCredential | null = null;

  try {
    credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await credential.user.getIdToken(true);

    const sessionData = await establishServerSession("/api/auth/login", {
      idToken,
      expectedRole,
    });

    // Force refresh token in case claims were freshly synced
    await credential.user.getIdToken(true);
    return sessionData;
  } catch (err) {
    // Sign out client if server rejected the portal role or account status
    if (credential) {
      await signOut(auth).catch(() => {});
    }
    throw new Error(formatFirebaseAuthError(err));
  }
}

/**
 * Registers a new STUDENT account via Firebase Auth + Firestore profile provisioning.
 */
export async function registerStudentAccount(input: {
  name: string;
  email: string;
  password: string;
  studentId: string;
  department: string;
  phone?: string;
}): Promise<AuthSessionResponse> {
  const { auth } = getFirebaseClient();
  let credential: UserCredential | null = null;

  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );

    await updateProfile(credential.user, {
      displayName: input.name.trim(),
    });

    const idToken = await credential.user.getIdToken(true);

    const sessionData = await establishServerSession("/api/auth/register", {
      idToken,
      name: input.name.trim(),
      studentId: input.studentId.trim(),
      department: input.department.trim(),
      phone: input.phone?.trim() || undefined,
    });

    // Refresh token to pick up custom claims ({ role: "STUDENT", isActive: true })
    await credential.user.getIdToken(true);
    return sessionData;
  } catch (err) {
    if (credential) {
      // Clean up partially provisioned auth user if backend onboarding fails
      try {
        await credential.user.delete();
      } catch {
        await signOut(auth).catch(() => {});
      }
    }
    throw new Error(formatFirebaseAuthError(err, "Failed to register student account."));
  }
}

/**
 * Signs in with Google OAuth Popup and verifies portal authorization on the server.
 */
export async function signInWithGooglePortal(
  expectedRole: UserRole
): Promise<AuthSessionResponse> {
  const { auth } = getFirebaseClient();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  let credential: UserCredential | null = null;
  try {
    credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken(true);

    const sessionData = await establishServerSession("/api/auth/google", {
      idToken,
      expectedRole,
    });

    await credential.user.getIdToken(true);
    return sessionData;
  } catch (err) {
    if (credential) {
      await signOut(auth).catch(() => {});
    }
    throw new Error(formatFirebaseAuthError(err, "Google authentication failed."));
  }
}

/**
 * Sends a Firebase Authentication password reset email.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { auth } = getFirebaseClient();
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/login/student`,
      handleCodeInApp: false,
    };
    await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // Do not disclose whether account exists for auth/user-not-found
    if (code === "auth/user-not-found") {
      return;
    }
    throw new Error(formatFirebaseAuthError(err, "Failed to send password reset email."));
  }
}

/**
 * Logs out both Firebase Auth client state and server-side HTTP-only session cookie.
 */
export async function logoutAll(): Promise<void> {
  try {
    const { auth } = getFirebaseClient();
    await signOut(auth);
  } catch {
    // Proceed to clear server cookie even if client SDK unconfigured
  }

  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

