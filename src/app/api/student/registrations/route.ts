import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.STUDENT) {
      return NextResponse.json(
        { error: "Forbidden: This endpoint is restricted to student accounts." },
        { status: 403 }
      );
    }

    // STRICT STUDENT ISOLATION: Query ONLY with studentId === user.id
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            bannerUrl: true,
            mode: true,
            venue: true,
            startDate: true,
            endDate: true,
            status: true,
            category: true,
          },
        },
      },
      orderBy: { registeredAt: "desc" },
    });

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error("[Student Registrations GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}
