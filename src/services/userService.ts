import { getAdminAuth, getAdminDb, FieldValue, isFirebaseAdminConfigured } from "@/firebase/admin";
import { ROLES, UserRole } from "@/lib/constants";
import { AuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toSerializable } from "./firestoreConverters";

export async function listUsersByRole(role?: UserRole, search?: string) {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  let q = db.collection("users") as FirebaseFirestore.Query;
  if (role) {
    q = q.where("role", "==", role);
  }

  const snap = await q.orderBy("createdAt", "desc").get().catch(async () => {
    const fallback = role
      ? await db.collection("users").where("role", "==", role).get()
      : await db.collection("users").get();
    return fallback;
  });

  let users = snap.docs.map((doc) =>
    toSerializable<any>({
      id: doc.id,
      ...doc.data(),
      _count: { registrations: Number(doc.data().registrationCount || 0) },
    })
  );

  if (search) {
    const term = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.studentId?.toLowerCase().includes(term) ||
        u.department?.toLowerCase().includes(term)
    );
  }

  return users;
}

export async function createCoordinatorAccount(
  input: {
    name: string;
    email: string;
    password: string;
    department?: string;
    phone?: string;
  },
  actor: AuthUser
) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const emailLower = input.email.trim().toLowerCase();

  // Check if user already exists in Firebase Auth or Firestore
  const existingFirestore = await db
    .collection("users")
    .where("email", "==", emailLower)
    .limit(1)
    .get();

  if (!existingFirestore.empty) {
    throw new Error("EMAIL_EXISTS");
  }

  const authRecord = await adminAuth.createUser({
    email: emailLower,
    password: input.password,
    displayName: input.name.trim(),
    disabled: false,
  });

  // Set custom claims so Firestore/Storage security rules recognize COORDINATOR role cleanly
  await adminAuth.setCustomUserClaims(authRecord.uid, {
    role: ROLES.COORDINATOR,
    isActive: true,
  });

  const userProfile = {
    uid: authRecord.uid,
    email: emailLower,
    name: input.name.trim(),
    role: ROLES.COORDINATOR,
    isActive: true,
    department: input.department?.trim() || null,
    phone: input.phone?.trim() || null,
    studentId: null,
    photoURL: null,
    preferences: { notifications: true, theme: "dark" },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(authRecord.uid).set(userProfile);

  await logAudit({
    action: "COORDINATOR_CREATED",
    entityType: "User",
    entityId: authRecord.uid,
    details: { email: emailLower, createdBy: actor.email },
    userId: actor.uid,
    userEmail: actor.email,
  });

  return toSerializable<any>({
    id: authRecord.uid,
    ...userProfile,
    createdAt: new Date().toISOString(),
  });
}

export async function updateUserRoleAndStatus(
  targetUid: string,
  updates: { isActive?: boolean; role?: UserRole },
  actor: AuthUser
) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  const targetRef = db.collection("users").doc(targetUid);
  const targetSnap = await targetRef.get();

  if (!targetSnap.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const targetData = targetSnap.data()!;

  // CRITICAL SECURITY INVARIANT:
  // Protect against deleting, demoting, or deactivating the last active Super Admin
  if (targetData.role === ROLES.SUPER_ADMIN) {
    const isDemoting = updates.role && updates.role !== ROLES.SUPER_ADMIN;
    const isDeactivating = updates.isActive === false;

    if (isDemoting || isDeactivating) {
      const activeAdminsSnap = await db
        .collection("users")
        .where("role", "==", ROLES.SUPER_ADMIN)
        .where("isActive", "==", true)
        .get();

      if (activeAdminsSnap.size <= 1) {
        throw new Error("LAST_SUPER_ADMIN_PROTECTION");
      }
    }
  }

  const nextRole = updates.role || (targetData.role as UserRole);
  const nextActive =
    typeof updates.isActive === "boolean"
      ? updates.isActive
      : targetData.isActive !== false;

  // Update Firestore profile
  await targetRef.update({
    role: nextRole,
    isActive: nextActive,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Synchronize Firebase Auth Custom Claims & Disabled State
  await adminAuth.setCustomUserClaims(targetUid, {
    role: nextRole,
    isActive: nextActive,
  });

  await adminAuth.updateUser(targetUid, {
    disabled: !nextActive,
  });

  if (!nextActive || updates.role) {
    await adminAuth.revokeRefreshTokens(targetUid);
  }

  await logAudit({
    action: "USER_ACCOUNT_UPDATED",
    entityType: "User",
    entityId: targetUid,
    details: {
      targetEmail: targetData.email,
      isActive: nextActive,
      role: nextRole,
      updatedBy: actor.email,
    },
    userId: actor.uid,
    userEmail: actor.email,
  });

  return toSerializable<any>({
    id: targetUid,
    ...targetData,
    role: nextRole,
    isActive: nextActive,
  });
}

