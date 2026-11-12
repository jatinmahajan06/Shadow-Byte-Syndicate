import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { registerStudentForEvent } from "@/services/eventService";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in as a student to register for events." },
        { status: 401 }
      );
    }

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

    const result = await registerStudentForEvent(eventId, user, notes);

    await sendEmail({
      to: user.email,
      subject: `Registration Confirmed: ${result.eventTitle}`,
      html: `<p>Hello ${user.name},</p><p>Your seat for <strong>${result.eventTitle}</strong> has been confirmed.</p>`,
      text: `Registration confirmed for ${result.eventTitle}.`,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully registered for event!",
      registrationId: result.registrationId,
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
      case "EVENT_FULL":
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
