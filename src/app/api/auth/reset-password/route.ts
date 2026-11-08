import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { passwordResetSubmitSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = passwordResetSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reset parameters: " + parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    if (resetToken.used || new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: "This password reset token has already been used or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    // Atomically update password, mark token as used, and invalidate existing active sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    await logAudit({
      action: "PASSWORD_RESET_SUCCESS",
      entityType: "User",
      entityId: resetToken.userId,
      userId: resetToken.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. Please log in with your new password.",
    });
  } catch (error) {
    console.error("[Reset Password Error]", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
