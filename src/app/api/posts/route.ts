import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { postSchema, postStatusUpdateSchema } from "@/lib/validators";
import { ROLES, PUBLISH_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { getAllPosts } from "@/services/postService";
import { toSerializable } from "@/services/firestoreConverters";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status") || undefined;

    const user = await getCurrentUser();
    const isStaff = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.COORDINATOR;

    const statusFilter = isStaff && statusParam ? statusParam : PUBLISH_STATUS.PUBLISHED;
    const posts = await getAllPosts(statusFilter, category, search);

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("[Posts GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: Only coordinators and administrators can create posts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getAdminDb();

    const existingSlug = await db
      .collection("posts")
      .where("slug", "==", data.slug)
      .limit(1)
      .get();

    if (!existingSlug.empty) {
      return NextResponse.json(
        { error: "A post with this URL slug already exists." },
        { status: 409 }
      );
    }

    const docRef = db.collection("posts").doc();
    const payload = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage || null,
      category: data.category,
      tags: data.tags || null,
      status: data.status,
      publishedAt:
        data.status === PUBLISH_STATUS.PUBLISHED ? FieldValue.serverTimestamp() : null,
      createdById: user.uid,
      createdByName: user.name,
      createdByRole: user.role,
      createdByEmail: user.email,
      updatedById: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    await logAudit({
      action: "POST_CREATE",
      entityType: "Post",
      entityId: docRef.id,
      details: { title: data.title, slug: data.slug, createdBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    const createdSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      post: toSerializable({
        id: docRef.id,
        ...createdSnap.data(),
        createdBy: { name: user.name, email: user.email, role: user.role },
      }),
    });
  } catch (error) {
    console.error("[Posts POST Error]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const parsed = postSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getAdminDb();

    const collisionSnap = await db
      .collection("posts")
      .where("slug", "==", data.slug)
      .get();

    if (collisionSnap.docs.some((d) => d.id !== id)) {
      return NextResponse.json(
        { error: "Another post already uses this slug." },
        { status: 409 }
      );
    }

    const docRef = db.collection("posts").doc(id);
    const currentSnap = await docRef.get();
    if (!currentSnap.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const currentData = currentSnap.data()!;

    await docRef.update({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage || null,
      category: data.category,
      tags: data.tags || null,
      status: data.status,
      publishedAt:
        data.status === PUBLISH_STATUS.PUBLISHED && !currentData.publishedAt
          ? FieldValue.serverTimestamp()
          : currentData.publishedAt || null,
      updatedById: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "POST_UPDATE",
      entityType: "Post",
      entityId: id,
      details: { title: data.title, updatedBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    const updatedSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      post: toSerializable({ id, ...updatedSnap.data() }),
    });
  } catch (error) {
    console.error("[Posts PUT Error]", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = postStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { id, status } = parsed.data;
    const db = getAdminDb();
    const docRef = db.collection("posts").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const currentData = snap.data()!;
    await docRef.update({
      status,
      publishedAt:
        status === PUBLISH_STATUS.PUBLISHED && !currentData.publishedAt
          ? FieldValue.serverTimestamp()
          : currentData.publishedAt || null,
      updatedById: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      action: "POST_STATUS_UPDATED",
      entityType: "Post",
      entityId: id,
      details: {
        title: currentData.title,
        previousStatus: currentData.status,
        newStatus: status,
        updatedBy: user.email,
      },
      userId: user.uid,
      userEmail: user.email,
    });

    const updatedSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      post: toSerializable({ id, ...updatedSnap.data() }),
    });
  } catch (error) {
    console.error("[Posts PATCH Error]", error);
    return NextResponse.json({ error: "Failed to update post status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can permanently delete posts." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("posts").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const title = snap.data()?.title || id;
    await docRef.delete();

    await logAudit({
      action: "POST_DELETE",
      entityType: "Post",
      entityId: id,
      details: { title, deletedBy: user.email },
      userId: user.uid,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, message: "Post permanently deleted" });
  } catch (error) {
    console.error("[Posts DELETE Error]", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
