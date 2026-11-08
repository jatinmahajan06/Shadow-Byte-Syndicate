import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { eventSchema } from "@/lib/validators";
import { ROLES, PUBLISH_STATUS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const statusParam = searchParams.get("status");

    const user = await getCurrentUser();
    const isStaff = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.COORDINATOR;

    // Public visitors and students can ONLY see PUBLISHED events!
    const statusFilter = isStaff && statusParam ? statusParam : PUBLISH_STATUS.PUBLISHED;

    const where: any = {
      status: statusFilter,
    };

    if (mode && mode !== "ALL") {
      where.mode = mode;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("[Events GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Both Super Admin and Coordinator can create events
    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: Only coordinators and administrators can create events." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An event with this URL slug already exists. Please modify the slug." },
        { status: 409 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        bannerUrl: data.bannerUrl || null,
        mode: data.mode,
        venue: data.venue,
        locationUrl: data.locationUrl || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationDeadline: new Date(data.registrationDeadline),
        capacity: data.capacity,
        status: data.status,
        isRegistrationOpen: data.isRegistrationOpen,
        category: data.category,
        createdById: user.id,
      },
    });

    await logAudit({
      action: "EVENT_CREATE",
      entityType: "Event",
      entityId: event.id,
      details: { title: event.title, slug: event.slug, createdBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("[Events POST Error]", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
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
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const parsed = eventSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug collision with other events
    const collision = await prisma.event.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });

    if (collision) {
      return NextResponse.json(
        { error: "Another event already has this slug." },
        { status: 409 }
      );
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        bannerUrl: data.bannerUrl || null,
        mode: data.mode,
        venue: data.venue,
        locationUrl: data.locationUrl || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationDeadline: new Date(data.registrationDeadline),
        capacity: data.capacity,
        status: data.status,
        isRegistrationOpen: data.isRegistrationOpen,
        category: data.category,
        updatedById: user.id,
      },
    });

    await logAudit({
      action: "EVENT_UPDATE",
      entityType: "Event",
      entityId: updated.id,
      details: { title: updated.title, updatedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error("[Events PUT Error]", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT PERMISSION: Only SUPER_ADMIN can permanently delete events!
    // Coordinators cannot permanently delete records per Section 3!
    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can permanently delete events." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const deleted = await prisma.event.delete({
      where: { id },
    });

    await logAudit({
      action: "EVENT_DELETE",
      entityType: "Event",
      entityId: id,
      details: { title: deleted.title, deletedBy: user.email },
      userId: user.id,
    });

    return NextResponse.json({ success: true, message: "Event permanently deleted" });
  } catch (error) {
    console.error("[Events DELETE Error]", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
