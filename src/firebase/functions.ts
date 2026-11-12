"use client";

import { httpsCallable } from "firebase/functions";
import { getFirebaseClient } from "./config";

/**
 * Invokes a deployed / emulated Firebase Cloud Function by name.
 */
export async function invokeCloudFunction<TReq = unknown, TRes = unknown>(
  functionName: string,
  payload: TReq
): Promise<TRes> {
  const { functions } = getFirebaseClient();
  const callable = httpsCallable<TReq, TRes>(functions, functionName);
  const result = await callable(payload);
  return result.data;
}

export async function callRegisterForEventFunction(
  eventId: string,
  notes?: string
) {
  return invokeCloudFunction<
    { eventId: string; notes?: string },
    { success: boolean; registrationId: string; message: string }
  >("registerForEvent", { eventId, notes });
}

