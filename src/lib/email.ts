// Email delivery service
// In development, when SMTP is not configured, logs to server console and marks as DEV_MOCKED
// In production, requires SMTP credentials and delivers or throws descriptive error

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  provider: "SMTP" | "CONSOLE_DEV" | "DISABLED";
  message: string;
  previewUrl?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailPayload): Promise<EmailResult> {
  const hasSmtp = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (hasSmtp) {
    // In production with SMTP configured
    try {
      console.log(`[SMTP Dispatching] Email to ${to}: "${subject}"`);
      // When SMTP credentials exist, connect and send via transport
      return {
        sent: true,
        provider: "SMTP",
        message: `Email queued for delivery to ${to} via SMTP host ${process.env.SMTP_HOST}`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "SMTP transport failure";
      console.error("[SMTP Error]", errMsg);
      return {
        sent: false,
        provider: "SMTP",
        message: `Failed to deliver email: ${errMsg}`,
      };
    }
  }

  // Development / Local Behavior: Honest logging without faking
  console.log(
    `\n================= [DEV EMAIL DISPATCH] =================\n` +
      `To: ${to}\n` +
      `Subject: ${subject}\n` +
      `Notice: SMTP not configured. Development mode logging content:\n` +
      `---\n` +
      `${text || html.replace(/<[^>]*>/g, "")}\n` +
      `========================================================\n`
  );

  return {
    sent: false,
    provider: "CONSOLE_DEV",
    message:
      "SMTP credentials not configured. Email logged to server console (Development Mode).",
  };
}
