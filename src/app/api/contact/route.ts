import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/firebase/admin";
import { contactSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { getSiteSettings } from "@/services/siteService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = rateLimit(`contact:${ip}`, 3, 300);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: `Please wait ${limiter.resetInSeconds} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const db = getAdminDb();

    const docRef = await db.collection("contactMessages").add({
      name,
      email,
      subject,
      message,
      isRead: false,
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const settings = await getSiteSettings();
    const destinationEmail = settings.contactEmail?.trim();

    const emailResult = destinationEmail
      ? await sendEmail({
          to: destinationEmail,
          subject: `[Contact Form] ${subject} (from ${name})`,
          html: `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br>")}</p>
          `,
          text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
        })
      : {
          sent: false,
          provider: "DISABLED" as const,
          message:
            "Submission stored in Cloud Firestore. Administrative notification email is not configured yet.",
        };

    return NextResponse.json({
      success: true,
      message: "Your message has been received and stored in Cloud Firestore. Our team will respond shortly.",
      emailDelivery: emailResult,
      id: docRef.id,
    });
  } catch (error) {
    console.error("[Contact API Error]", error);
    return NextResponse.json(
      { error: "Failed to submit message. Please try again later." },
      { status: 500 }
    );
  }
}
