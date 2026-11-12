import { getAdminDb, FieldValue, isFirebaseAdminConfigured } from "@/firebase/admin";

export async function logAudit({
  action,
  entityType,
  entityId,
  details,
  userId,
  userEmail,
  ipAddress,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
}) {
  try {
    if (!isFirebaseAdminConfigured()) return;

    const db = getAdminDb();
    const detailsStr =
      typeof details === "object" ? JSON.stringify(details) : details || null;

    await db.collection("auditLogs").add({
      action,
      entityType,
      entityId: entityId || null,
      details: detailsStr,
      userId: userId || null,
      userEmail: userEmail || null,
      ipAddress: ipAddress || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[Firestore AuditLog Error]", error);
  }
}

export async function recordUserActivity(
  uid: string,
  action: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  try {
    if (!isFirebaseAdminConfigured() || !uid) return;
    const db = getAdminDb();
    await db
      .collection("users")
      .doc(uid)
      .collection("activityHistory")
      .add({
        action,
        description,
        metadata: metadata || {},
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("[User ActivityHistory Error]", error);
  }
}
