import { getAdminDb, isFirebaseAdminConfigured } from "@/firebase/admin";
import { PUBLISH_STATUS } from "@/lib/constants";
import { toSerializable } from "./firestoreConverters";

export interface PostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string | null;
  status: string;
  publishedAt: string | null;
  createdById: string;
  createdBy: { name: string; role?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export async function getPublishedPosts(options?: {
  category?: string;
  search?: string;
  limitCount?: number;
}): Promise<PostRecord[]> {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  let q = db
    .collection("posts")
    .where("status", "==", PUBLISH_STATUS.PUBLISHED) as FirebaseFirestore.Query;

  if (options?.category && options.category !== "ALL") {
    q = q.where("category", "==", options.category);
  }

  const snap = await q.orderBy("publishedAt", "desc").get().catch(async () => {
    return db
      .collection("posts")
      .where("status", "==", PUBLISH_STATUS.PUBLISHED)
      .get();
  });

  let items = snap.docs.map((doc) => {
    const data = doc.data();
    return toSerializable<PostRecord>({
      id: doc.id,
      ...data,
      createdBy: {
        name: data.createdByName || "Club Author",
        role: data.createdByRole || "COORDINATOR",
        email: data.createdByEmail || "",
      },
    });
  });

  items.sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dbTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dbTime - da;
  });

  if (options?.search) {
    const term = options.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.excerpt.toLowerCase().includes(term) ||
        p.content.toLowerCase().includes(term) ||
        (p.tags && p.tags.toLowerCase().includes(term))
    );
  }

  if (options?.limitCount && options.limitCount > 0) {
    items = items.slice(0, options.limitCount);
  }

  return items;
}

export async function getAllPosts(statusFilter?: string, category?: string, search?: string): Promise<PostRecord[]> {
  if (!isFirebaseAdminConfigured()) return [];

  const db = getAdminDb();
  const snap = await db.collection("posts").orderBy("createdAt", "desc").get();

  let items = snap.docs.map((doc) => {
    const data = doc.data();
    return toSerializable<PostRecord>({
      id: doc.id,
      ...data,
      createdBy: {
        name: data.createdByName || "Club Author",
        role: data.createdByRole || "COORDINATOR",
        email: data.createdByEmail || "",
      },
    });
  });

  if (statusFilter && statusFilter !== "ALL") {
    items = items.filter((p) => p.status === statusFilter);
  }
  if (category && category !== "ALL") {
    items = items.filter((p) => p.category === category);
  }
  if (search) {
    const term = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.excerpt.toLowerCase().includes(term) ||
        p.content.toLowerCase().includes(term)
    );
  }

  return items;
}

export async function getPostBySlug(slug: string): Promise<PostRecord | null> {
  if (!isFirebaseAdminConfigured()) return null;

  const db = getAdminDb();
  const snap = await db.collection("posts").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();

  return toSerializable<PostRecord>({
    id: doc.id,
    ...data,
    createdBy: {
      name: data.createdByName || "Club Author",
      role: data.createdByRole || "COORDINATOR",
      email: data.createdByEmail || "",
    },
  });
}

