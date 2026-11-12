"use client";

import { useEffect, useState } from "react";
import { QueryConstraint } from "firebase/firestore";
import { subscribeCollection } from "@/firebase/firestore";
import { isFirebaseConfigured } from "@/firebase/config";

export function useFirestoreCollection<T>(
  pathSegments: string[],
  constraints: QueryConstraint[],
  initialData: T[] = [],
  enabled = true
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(enabled && initialData.length === 0);
  const [error, setError] = useState<string | null>(null);

  const pathKey = pathSegments.join("/");

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeCollection<T>(
      pathSegments,
      constraints,
      (items) => {
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, enabled]);

  return { data, setData, loading, error };
}

