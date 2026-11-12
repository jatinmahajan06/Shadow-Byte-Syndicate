import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  Functions,
} from "firebase/functions";

export const USE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

const rawConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const PLACEHOLDER_VALUES = [
  "",
  "YOUR_FIREBASE_API_KEY",
  "YOUR_PROJECT_ID",
  "YOUR_APP_ID",
];

export function isFirebaseConfigured(): boolean {
  if (USE_EMULATORS) {
    return true;
  }
  return Boolean(
    rawConfig.apiKey &&
      !PLACEHOLDER_VALUES.includes(rawConfig.apiKey) &&
      rawConfig.projectId &&
      !PLACEHOLDER_VALUES.includes(rawConfig.projectId) &&
      rawConfig.authDomain &&
      rawConfig.appId
  );
}

const firebaseConfig = USE_EMULATORS && !rawConfig.apiKey
  ? {
      // Standard Firebase Local Emulator Suite demo configuration (not live production credentials)
      apiKey: "demo-emulator-api-key",
      authDomain: "demo-shadow-byte-syndicate.firebaseapp.com",
      projectId: rawConfig.projectId || "demo-shadow-byte-syndicate",
      storageBucket: rawConfig.storageBucket || "demo-shadow-byte-syndicate.appspot.com",
      messagingSenderId: rawConfig.messagingSenderId || "000000000000",
      appId: rawConfig.appId || "1:000000000000:web:emulator",
    }
  : rawConfig;

// Prevent multiple initializations during Next.js HMR / SSR
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

declare global {
  // eslint-disable-next-line no-var
  var __firebaseEmulatorsConnected: boolean | undefined;
}

export function getFirebaseClient(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
} {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase client configuration is missing. Please set NEXT_PUBLIC_FIREBASE_* variables in .env from your Firebase Console."
    );
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!authInstance) {
    authInstance = getAuth(app);
    if (typeof window !== "undefined") {
      setPersistence(authInstance, browserLocalPersistence).catch(() => {
        // Ignore persistence fallback errors in restricted private browsing modes
      });
    }
  }

  if (!dbInstance) {
    dbInstance = getFirestore(app);
  }

  if (!storageInstance) {
    storageInstance = getStorage(app);
  }

  if (!functionsInstance) {
    functionsInstance = getFunctions(app);
  }

  // Connect to Firebase Local Emulators exactly once
  if (USE_EMULATORS && !globalThis.__firebaseEmulatorsConnected) {
    const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
    const firestoreHost = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    const storageHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199";
    const functionsHost = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001";

    try {
      connectAuthEmulator(authInstance, `http://${authHost}`, { disableWarnings: true });
    } catch {
      // Already connected
    }

    try {
      const [fsHost, fsPort] = firestoreHost.split(":");
      connectFirestoreEmulator(dbInstance, fsHost, Number(fsPort || 8080));
    } catch {
      // Already connected
    }

    try {
      const [stHost, stPort] = storageHost.split(":");
      connectStorageEmulator(storageInstance, stHost, Number(stPort || 9199));
    } catch {
      // Already connected
    }

    try {
      const [fnHost, fnPort] = functionsHost.split(":");
      connectFunctionsEmulator(functionsInstance, fnHost, Number(fnPort || 5001));
    } catch {
      // Already connected
    }

    globalThis.__firebaseEmulatorsConnected = true;
  }

  return {
    app,
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance,
    functions: functionsInstance,
  };
}

