import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

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

    const contactRecord = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    const destinationEmail = settings?.contactEmail || "contact@shadowbyte.club";

    const emailResult = await sendEmail({
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
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been received. Our team will review and respond shortly.",
      emailDelivery: emailResult,
      id: contactRecord.id,
    });
  } catch (error) {
    console.error("[Contact API Error]", error);
    return NextResponse.json(
      { error: "Failed to submit message. Please try again later." },
      { status: 500 }
    );
  }
}
