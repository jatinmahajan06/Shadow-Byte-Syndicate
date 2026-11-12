import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import {
  getFirestore,
  Firestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

function isUsingEmulators(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" ||
    Boolean(
      process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST ||
        process.env.FIREBASE_STORAGE_EMULATOR_HOST
    )
  );
}

function ensureEmulatorEnv() {
  if (isUsingEmulators()) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
      "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ||
      "127.0.0.1:8080";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST =
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ||
      "127.0.0.1:9199";
  }
}

// Configure emulator host env vars if already set prior to module import
ensureEmulatorEnv();

function createAdminApp(): App {
  ensureEmulatorEnv();

  if (getApps().length > 0) {
    return getApp();
  }

  const useEmulators = isUsingEmulators();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    (useEmulators ? "demo-shadow-byte-syndicate" : undefined);

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined);

  // If running against local Firebase Emulators, no service account private key is needed
  if (useEmulators) {
    return initializeApp({
      projectId,
      storageBucket,
    });
  }

  // Option 1: Single-line JSON service account secret
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
        storageBucket,
      });
    } catch (err) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  }

  // Option 2: Individual environment variables (Vercel / cloud deployments)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket,
    });
  }

  // Option 3: Application Default Credentials (Google Cloud Run / Firebase App Hosting)
  if (projectId) {
    return initializeApp({
      projectId,
      storageBucket,
    });
  }

  throw new Error(
    "Firebase Admin SDK credentials not configured. Please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env, or enable NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true."
  );
}

let cachedApp: App | null = null;

function ensureApp(): App {
  if (!cachedApp) {
    cachedApp = createAdminApp();
  }
  return cachedApp;
}

export function isFirebaseAdminConfigured(): boolean {
  if (isUsingEmulators()) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return true;
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return true;
  }
  // Google Cloud Runtime ADC
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    return true;
  }
  return false;
}

export function getAdminAuth(): Auth {
  return getAuth(ensureApp());
}

export function getAdminDb(): Firestore {
  const db = getFirestore(ensureApp());
  return db;
}

export function getAdminStorage(): Storage {
  return getStorage(ensureApp());
}

export { FieldValue, Timestamp };

