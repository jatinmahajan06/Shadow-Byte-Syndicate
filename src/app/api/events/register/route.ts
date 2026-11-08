import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, PUBLISH_STATUS, REGISTRATION_STATUS } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in as a student to register for events." },
        { status: 401 }
      );
    }

    // STRICT ROLE ENFORCEMENT: Only STUDENT role accounts can register!
    if (user.role !== ROLES.STUDENT) {
      return NextResponse.json(
        {
          error:
            "Event registration is exclusively reserved for student members. Administrative or coordinator accounts cannot register as participants.",
        },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is currently inactive. Please contact administration." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { eventId, notes } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    // Interactive database transaction with atomic seat counting to prevent race conditions & oversubscription
    const registrationResult = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      // 1. Status Check
      if (event.status !== PUBLISH_STATUS.PUBLISHED) {
        throw new Error("EVENT_NOT_PUBLISHED");
      }

      // 2. Open flag check
      if (!event.isRegistrationOpen) {
        throw new Error("REGISTRATION_CLOSED_BY_ADMIN");
      }

      const now = new Date();

      // 3. Deadline check
      if (now > event.registrationDeadline) {
        throw new Error("DEADLINE_EXPIRED");
      }

      // 4. Past event check
      if (now > event.startDate) {
        throw new Error("EVENT_ALREADY_STARTED");
      }

      // 5. Existing registration check
      const existing = await tx.eventRegistration.findUnique({
        where: {
          eventId_studentId: {
            eventId: event.id,
            studentId: user.id,
          },
        },
      });

      if (existing) {
        if (existing.status === REGISTRATION_STATUS.CONFIRMED) {
          throw new Error("ALREADY_REGISTERED");
        } else {
          // Re-activate previously cancelled registration
          const updated = await tx.eventRegistration.update({
            where: { id: existing.id },
            data: {
              status: REGISTRATION_STATUS.CONFIRMED,
              registeredAt: new Date(),
              notes: notes || null,
            },
          });
          return { registration: updated, event, reactivated: true };
        }
      }

      // 6. Capacity Check
      const confirmedCount = await tx.eventRegistration.count({
        where: {
          eventId: event.id,
          status: REGISTRATION_STATUS.CONFIRMED,
        },
      });

      if (confirmedCount >= event.capacity) {
        throw new Error("EVENT_CAPACITY_REACHED");
      }

      // 7. Create registration
      const newRegistration = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          studentId: user.id,
          status: REGISTRATION_STATUS.CONFIRMED,
          notes: notes || null,
        },
      });

      return { registration: newRegistration, event, reactivated: false };
    });

    // Optional confirmation email
    await sendEmail({
      to: user.email,
      subject: `Registration Confirmed: ${registrationResult.event.title}`,
      html: `
        <div style="font-family: sans-serif; background-color: #050508; color: #f1f5f9; padding: 24px;">
          <h2 style="color: #ff1e27;">Registration Confirmed</h2>
          <p>Hello ${user.name},</p>
          <p>Your seat for <strong>${registrationResult.event.title}</strong> has been secured.</p>
          <p><strong>Venue / Mode:</strong> ${registrationResult.event.venue} (${registrationResult.event.mode})</p>
          <p><strong>Date & Time:</strong> ${new Date(
            registrationResult.event.startDate
          ).toLocaleString()}</p>
          <p style="margin-top: 20px; font-size: 13px; color: #94a3b8;">You can manage your registration in your Student Dashboard.</p>
        </div>
      `,
      text: `Registration confirmed for ${registrationResult.event.title}. Venue: ${registrationResult.event.venue}. Date: ${new Date(registrationResult.event.startDate).toLocaleString()}`,
    });

    await logAudit({
      action: "EVENT_REGISTRATION_SUCCESS",
      entityType: "EventRegistration",
      entityId: registrationResult.registration.id,
      details: {
        eventId: registrationResult.event.id,
        eventTitle: registrationResult.event.title,
        studentEmail: user.email,
      },
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully registered for event!",
      registration: registrationResult.registration,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "REGISTRATION_FAILED";

    switch (message) {
      case "EVENT_NOT_FOUND":
        return NextResponse.json({ error: "The requested event could not be found." }, { status: 404 });
      case "EVENT_NOT_PUBLISHED":
        return NextResponse.json(
          { error: "This event is currently in draft or has been archived." },
          { status: 400 }
        );
      case "REGISTRATION_CLOSED_BY_ADMIN":
        return NextResponse.json(
          { error: "Registration for this event is currently closed." },
          { status: 400 }
        );
      case "DEADLINE_EXPIRED":
        return NextResponse.json(
          { error: "The registration deadline for this event has passed." },
          { status: 400 }
        );
      case "EVENT_ALREADY_STARTED":
        return NextResponse.json(
          { error: "This event has already commenced or concluded." },
          { status: 400 }
        );
      case "ALREADY_REGISTERED":
        return NextResponse.json(
          { error: "You are already registered for this event." },
          { status: 409 }
        );
      case "EVENT_CAPACITY_REACHED":
        return NextResponse.json(
          { error: "Registration full: This event has reached maximum capacity." },
          { status: 409 }
        );
      default:
        console.error("[Event Register API Error]", error);
        return NextResponse.json(
          { error: "Failed to process registration. Please try again." },
          { status: 500 }
        );
    }
  }
}
