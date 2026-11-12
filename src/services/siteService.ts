import { getAdminDb, isFirebaseAdminConfigured } from "@/firebase/admin";
import { BRAND } from "@/lib/constants";
import { toSerializable } from "./firestoreConverters";

export interface SiteSettingsRecord {
  id: string;
  clubName: string;
  supportingLine: string;
  mainTagline: string;
  secondaryPhrase: string;
  contactEmail: string;
  headquarters: string;
  timezone: string;
  instagramHandle: string;
  youtubeChannel: string;
  discordInvite: string;
  bannerUrl: string;
  shieldLogoUrl: string;
  aboutSummary: string;
  ethicsStatement: string;
  updatedAt?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsRecord = {
  id: "default",
  clubName: BRAND.name,
  supportingLine: BRAND.supportingLine,
  mainTagline: BRAND.mainTagline,
  secondaryPhrase: BRAND.secondaryPhrase,
  contactEmail: "",
  headquarters: "",
  timezone: "Asia/Kolkata",
  instagramHandle: "",
  youtubeChannel: "",
  discordInvite: "",
  bannerUrl: BRAND.assets.banner,
  shieldLogoUrl: BRAND.assets.shield,
  aboutSummary:
    "Shadow Byte Syndicate is an elite student-led collegiate cybersecurity defense collective dedicated to hands-on security research, CTF competitions, threat intelligence, and digital defense.",
  ethicsStatement:
    "Shadow Byte Syndicate operates under strict ethical guidelines. All penetration testing and offensive techniques are practiced strictly in authorized sandboxed labs and sanctioned environments. We prioritize defensive security and responsible disclosure.",
};

export async function getSiteSettings(): Promise<SiteSettingsRecord> {
  if (!isFirebaseAdminConfigured()) return DEFAULT_SITE_SETTINGS;

  try {
    const db = getAdminDb();
    const snap = await db.collection("siteSettings").doc("default").get();
    if (!snap.exists) return DEFAULT_SITE_SETTINGS;

    return {
      ...DEFAULT_SITE_SETTINGS,
      ...toSerializable<Partial<SiteSettingsRecord>>(snap.data()),
      id: "default",
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getTeamMembers(options?: {
  onlyActive?: boolean;
  category?: string;
  limitCount?: number;
}) {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const snap = await db.collection("teamMembers").orderBy("displayOrder", "asc").get();

  let items = snap.docs.map((doc) =>
    toSerializable<any>({ id: doc.id, ...doc.data() })
  );

  if (options?.onlyActive) {
    items = items.filter((m) => m.isActive !== false);
  }
  if (options?.category) {
    items = items.filter((m) => m.category === options.category);
  }
  if (options?.limitCount && options.limitCount > 0) {
    items = items.slice(0, options.limitCount);
  }

  return items;
}

export async function getResources(options?: {
  onlyPublished?: boolean;
  category?: string;
  search?: string;
  limitCount?: number;
}) {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const snap = await db.collection("resources").orderBy("createdAt", "desc").get();

  let items = snap.docs.map((doc) =>
    toSerializable<any>({ id: doc.id, ...doc.data() })
  );

  if (options?.onlyPublished) {
    items = items.filter((r) => r.isPublished !== false);
  }
  if (options?.category && options.category !== "ALL") {
    items = items.filter((r) => r.category === options.category);
  }
  if (options?.search) {
    const term = options.search.toLowerCase();
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term)
    );
  }
  if (options?.limitCount && options.limitCount > 0) {
    items = items.slice(0, options.limitCount);
  }

  return items;
}

export async function getGalleryItems() {
  if (!isFirebaseAdminConfigured()) return [];
  const db = getAdminDb();
  const snap = await db.collection("gallery").orderBy("displayOrder", "asc").get();
  return snap.docs.map((doc) => toSerializable<any>({ id: doc.id, ...doc.data() }));
}

export async function getContactMessages() {
  if (!isFirebaseAdminConfigured()) return [];
  const db = getAdminDb();
  const snap = await db
    .collection("contactMessages")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => toSerializable<any>({ id: doc.id, ...doc.data() }));
}

export async function getAuditLogs(search?: string, limitCount = 50) {
  if (!isFirebaseAdminConfigured()) return [];
  const db = getAdminDb();
  const snap = await db
    .collection("auditLogs")
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();

  let items = snap.docs.map((doc) => {
    const d = doc.data();
    return toSerializable<any>({
      id: doc.id,
      ...d,
      user: d.userEmail ? { email: d.userEmail, name: d.userEmail } : null,
    });
  });

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(
      (l) =>
        l.action?.toLowerCase().includes(term) ||
        l.entityType?.toLowerCase().includes(term) ||
        l.details?.toLowerCase().includes(term) ||
        l.userEmail?.toLowerCase().includes(term)
    );
  }

  return items;
}

