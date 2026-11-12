import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively converts Firestore Admin Timestamps and Dates into ISO strings
 * so Server Components can safely pass data props to Client Components.
 */
export function toSerializable<T>(input: unknown): T {
  if (input === null || input === undefined) {
    return input as T;
  }

  if (input instanceof Timestamp) {
    return input.toDate().toISOString() as unknown as T;
  }

  if (input instanceof Date) {
    return input.toISOString() as unknown as T;
  }

  if (
    typeof input === "object" &&
    "toDate" in input &&
    typeof (input as { toDate: () => Date }).toDate === "function"
  ) {
    return (input as { toDate: () => Date }).toDate().toISOString() as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => toSerializable(item)) as unknown as T;
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = toSerializable(value);
    }
    return out as T;
  }

  return input as T;
}

export function docToData<T>(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
): T | null {
  if (!doc.exists) return null;
  const raw = doc.data() || {};
  return toSerializable<T>({
    id: doc.id,
    ...raw,
  });
}

