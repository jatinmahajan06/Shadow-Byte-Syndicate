"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseClient } from "./config";

/**
 * Safely converts Firestore Timestamp / ISO string / Date to ISO string.
 */
export function serializeFirestoreDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return "";
}

/**
 * Normalizes a Firestore document snapshot into a plain JSON-serializable object.
 */
export function mapSnapshotDoc<T>(id: string, data: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) {
    if (
      v instanceof Timestamp ||
      (typeof v === "object" && v !== null && "toDate" in v) ||
      (typeof v === "object" && v !== null && "seconds" in v && "nanoseconds" in v)
    ) {
      mapped[k] = serializeFirestoreDate(v);
    } else {
      mapped[k] = v;
    }
  }
  return mapped as T;
}

/**
 * Real-time subscription to a single Firestore document.
 */
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  onData: (item: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const { db } = getFirebaseClient();
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
      } else {
        onData(mapSnapshotDoc<T>(snap.id, snap.data() as Record<string, unknown>));
      }
    },
    (err) => {
      console.error(`[Firestore subscribeDocument ${collectionName}/${docId}]`, err);
      onError?.(err);
    }
  );
}

/**
 * Real-time subscription to a Firestore collection or subcollection with constraints.
 */
export function subscribeCollection<T>(
  pathSegments: string[],
  constraints: QueryConstraint[],
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const { db } = getFirebaseClient();
  const ref = collection(db, pathSegments[0], ...pathSegments.slice(1));
  const q = constraints.length > 0 ? query(ref, ...constraints) : ref;

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapSnapshotDoc<T>(d.id, d.data() as Record<string, unknown>)
      );
      onData(items);
    },
    (err) => {
      console.error(`[Firestore subscribeCollection ${pathSegments.join("/")}]`, err);
      onError?.(err);
    }
  );
}

/**
 * Updates the current authenticated student's personal profile details & preferences.
 * Note: Role and isActive cannot be modified client-side (enforced by Firestore Security Rules).
 */
export async function updateOwnUserProfile(
  uid: string,
  updates: {
    name?: string;
    department?: string;
    studentId?: string;
    phone?: string;
    photoURL?: string;
    preferences?: {
      notifications?: boolean;
      theme?: string;
    };
  }
) {
  const { db } = getFirebaseClient();
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // Record user-isolated activity history entry
  await addDoc(collection(db, "users", uid, "activityHistory"), {
    action: "PROFILE_UPDATED",
    description: "Updated account profile or notification preferences.",
    metadata: { updatedFields: Object.keys(updates) },
    createdAt: serverTimestamp(),
  });
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
};

