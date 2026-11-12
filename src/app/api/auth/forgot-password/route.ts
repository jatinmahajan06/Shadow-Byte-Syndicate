import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/firebase/admin";
import { passwordResetRequestSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = rateLimit(`forgot-pw:${ip}`, 3, 300);
    if (!limiter.success) {
      return NextResponse.json(
        { error: `Please wait ${limiter.resetInSeconds} seconds before requesting another reset.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = passwordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    // Generic message regardless of whether account exists (prevents account enumeration)
    const genericResponse = {
      success: true,
      message:
        "If an active account exists with that email, a password reset link has been dispatched via Firebase Authentication.",
    };

    try {
      const adminAuth = getAdminAuth();
      const userRecord = await adminAuth.getUserByEmail(email);

      if (userRecord && !userRecord.disabled) {
        const resetLink = await adminAuth.generatePasswordResetLink(email, {
          url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login/student`,
        });

        await sendEmail({
          to: email,
          subject: "Shadow Byte Syndicate - Password Reset Authorization",
          html: `<p>Click to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
          text: `Password Reset Link: ${resetLink}`,
        });
      }
    } catch {
      // Do not reveal user existence on failure
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[Forgot Password API Error]", error);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}
