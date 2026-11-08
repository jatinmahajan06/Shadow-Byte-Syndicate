import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordResetRequestSchema } from "@/lib/validators";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = rateLimit(`forgot-pass:${ip}`, 3, 300);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = passwordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return generic message to avoid disclosing account existence
    const genericResponse = {
      success: true,
      message:
        "If an active account exists with this email address, password recovery instructions have been dispatched.",
    };

    if (!user || !user.isActive) {
      return NextResponse.json(genericResponse);
    }

    // Invalidate existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create cryptographically secure single-use token expiring in 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    const emailResult = await sendEmail({
      to: user.email,
      subject: "Shadow Byte Syndicate - Password Reset Request",
      html: `
        <div style="font-family: sans-serif; background-color: #050508; color: #f1f5f9; padding: 24px; border-radius: 8px;">
          <h2 style="color: #ff1e27;">Password Reset Authorization</h2>
          <p>Hello ${user.name},</p>
          <p>A password reset was requested for your Shadow Byte Syndicate account. Click the button below to set a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #d61122; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </p>
          <p style="color: #94a3b8; font-size: 13px;">This single-use link expires in 60 minutes. If you did not request this, you may safely ignore this email.</p>
        </div>
      `,
      text: `Password reset requested for ${user.email}. Use this single-use link (expires in 1 hr): ${resetLink}`,
    });

    return NextResponse.json({
      ...genericResponse,
      devNotice: emailResult.provider === "CONSOLE_DEV" ? emailResult.message : undefined,
    });
  } catch (error) {
    console.error("[Forgot Password Error]", error);
    return NextResponse.json(
      { error: "Failed to process password reset." },
      { status: 500 }
    );
  }
}
