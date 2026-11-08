import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { postSchema } from "@/lib/validators";
import { ROLES, PUBLISH_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const statusParam = searchParams.get("status");

    const user = await getCurrentUser();
    const isStaff = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.COORDINATOR;

    const statusFilter = isStaff && statusParam ? statusParam : PUBLISH_STATUS.PUBLISHED;

    const where: any = {
      status: statusFilter,
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true, role: true },
        },
      },
    });

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

    const existing = await prisma.post.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A post with this URL slug already exists." },
        { status: 409 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage || null,
        category: data.category,
        tags: data.tags || null,
        status: data.status,
        publishedAt: data.status === PUBLISH_STATUS.PUBLISHED ? new Date() : null,
        createdById: user.id,
      },
    });

    await logAudit({
      action: "POST_CREATE",
      entityType: "Post",
      entityId: post.id,
      details: { title: post.title, slug: post.slug, createdBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, post });
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

    const collision = await prisma.post.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });

    if (collision) {
      return NextResponse.json(
        { error: "Another post already uses this slug." },
        { status: 409 }
      );
    }

    const currentPost = await prisma.post.findUnique({ where: { id } });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage || null,
        category: data.category,
        tags: data.tags || null,
        status: data.status,
        publishedAt:
          data.status === PUBLISH_STATUS.PUBLISHED && !currentPost?.publishedAt
            ? new Date()
            : currentPost?.publishedAt,
        updatedById: user.id,
      },
    });

    await logAudit({
      action: "POST_UPDATE",
      entityType: "Post",
      entityId: updated.id,
      details: { title: updated.title, updatedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error("[Posts PUT Error]", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT PERMISSION: Only SUPER_ADMIN can permanently delete posts!
    // Coordinators cannot permanently delete records per Section 3!
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

    const deleted = await prisma.post.delete({
      where: { id },
    });

    await logAudit({
      action: "POST_DELETE",
      entityType: "Post",
      entityId: id,
      details: { title: deleted.title, deletedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, message: "Post permanently deleted" });
  } catch (error) {
    console.error("[Posts DELETE Error]", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
