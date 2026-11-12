import dotenv from "dotenv";
dotenv.config();

// Ensure Firebase Emulators are enabled for all automated test suites
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-shadow-byte-syndicate";
process.env.FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "demo-shadow-byte-syndicate.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199";
process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001";

process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
process.env.FIRESTORE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST;

import { initializeApp, deleteApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getAdminAuth, getAdminDb, FieldValue } from "../src/firebase/admin";
import { ROLES, UserRole } from "../src/lib/constants";

export const TINY_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  )
);

export interface IsolatedClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  cleanup: () => Promise<void>;
}

export function createIsolatedClient(label: string): IsolatedClient {
  const uniqueName = `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const app = initializeApp(
    {
      apiKey: "demo-emulator-api-key",
      authDomain: "demo-shadow-byte-syndicate.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:test",
    },
    uniqueName
  );

  const auth = getAuth(app);
  connectAuthEmulator(
    auth,
    `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`,
    { disableWarnings: true }
  );

  const db = getFirestore(app);
  const [fsHost, fsPort] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST!.split(":");
  connectFirestoreEmulator(db, fsHost, Number(fsPort || 8080));

  const storage = getStorage(app);
  const [stHost, stPort] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST!.split(":");
  connectStorageEmulator(storage, stHost, Number(stPort || 9199));

  return {
    app,
    auth,
    db,
    storage,
    cleanup: async () => {
      await deleteApp(app).catch(() => {});
    },
  };
}

export async function provisionTestUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
  studentId?: string | null;
  department?: string | null;
}) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const emailLower = input.email.toLowerCase();
  const isActive = input.isActive !== false;

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(emailLower);
    uid = existing.uid;
    await adminAuth.updateUser(uid, {
      password: input.password,
      displayName: input.name,
      disabled: !isActive,
      emailVerified: true,
    });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "auth/user-not-found") {
      const created = await adminAuth.createUser({
        email: emailLower,
        password: input.password,
        displayName: input.name,
        disabled: !isActive,
        emailVerified: true,
      });
      uid = created.uid;
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(uid, {
    role: input.role,
    isActive,
  });

  await db
    .collection("users")
    .doc(uid)
    .set({
      uid,
      email: emailLower,
      name: input.name,
      role: input.role,
      isActive,
      studentId: input.studentId ?? (input.role === ROLES.STUDENT ? "TEST-STU-001" : null),
      department: input.department ?? "Cyber Security",
      phone: null,
      photoURL: null,
      preferences: { notifications: true, theme: "dark" },
      registrationCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return { uid, email: emailLower, name: input.name, role: input.role, isActive };
}

export async function cleanupTestUsers(uids: string[]) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  for (const uid of uids) {
    if (!uid) continue;
    await adminAuth.deleteUser(uid).catch(() => {});
    const historySnap = await db
      .collection("users")
      .doc(uid)
      .collection("activityHistory")
      .get()
      .catch(() => null);
    if (historySnap) {
      await Promise.all(historySnap.docs.map((d) => d.ref.delete().catch(() => {})));
    }
    await db.collection("users").doc(uid).delete().catch(() => {});
  }
}

export async function assertSecurityDenied(promise: Promise<unknown>, contextLabel: string) {
  let rejectedError: unknown = null;
  try {
    await promise;
  } catch (err) {
    rejectedError = err;
  }

  if (!rejectedError) {
    throw new Error(`Expected security rule denial for [${contextLabel}], but operation succeeded!`);
  }

  const errObj = rejectedError as { code?: string; message?: string };
  const combined = `${errObj.code || ""} ${errObj.message || ""}`;
  if (!/permission-denied|PERMISSION_DENIED|unauthorized|unauthenticated|false for|403/i.test(combined)) {
    throw new Error(
      `Expected permission denial for [${contextLabel}], got unexpected error: ${combined}`
    );
  }
}

