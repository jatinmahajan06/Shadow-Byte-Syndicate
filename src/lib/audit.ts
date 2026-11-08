import { prisma } from "./prisma";

export async function logAudit({
  action,
  entityType,
  entityId,
  details,
  userId,
  ipAddress,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  userId?: string;
  ipAddress?: string;
}) {
  try {
    const detailsStr =
      typeof details === "object" ? JSON.stringify(details) : details;

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: detailsStr,
        userId: userId || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    // Avoid failing main transaction on audit log error, but log to stderr
    console.error("[AuditLog Error]", error);
  }
}
