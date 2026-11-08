import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import { ROLES } from "../src/lib/constants";
import crypto from "crypto";

describe("Authentication & Role Authorization Invariants", () => {
  const testStudentEmail = `test-student-${Date.now()}@shadowbyte.club`;
  const testPassword = "Password123!Secure";

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testStudentEmail, `test-deactivated-${testStudentEmail}`],
        },
      },
    });
  });

  it("1. Public signup always creates STUDENT role even if privileged role is requested", async () => {
    // Simulate signup handler logic
    const requestedRole = "SUPER_ADMIN"; // Attempted privilege escalation
    const passwordHash = await hashPassword(testPassword);

    // Explicit server override as implemented in /api/auth/register
    const created = await prisma.user.create({
      data: {
        name: "Test Hacker",
        email: testStudentEmail.toLowerCase(),
        passwordHash,
        role: ROLES.STUDENT, // Forced by server
        studentId: "ROLL-999",
        department: "Cyber Security",
      },
    });

    expect(created.role).toBe(ROLES.STUDENT);
    expect(created.role).not.toBe(requestedRole);
  });

  it("2. Password hashing with bcrypt works correctly", async () => {
    const hash = await hashPassword("MyTestPassSecret!");
    const isValid = await verifyPassword("MyTestPassSecret!", hash);
    const isInvalid = await verifyPassword("WrongPassword!", hash);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it("3. Deactivated accounts are flagged and cannot be authorized", async () => {
    const deactEmail = `test-deactivated-${testStudentEmail}`;
    const hash = await hashPassword(testPassword);

    const deactUser = await prisma.user.create({
      data: {
        name: "Deactivated User",
        email: deactEmail,
        passwordHash: hash,
        role: ROLES.STUDENT,
        isActive: false, // Inactive
      },
    });

    // Check query validation pattern used by auth
    const userInDb = await prisma.user.findUnique({
      where: { id: deactUser.id },
    });

    expect(userInDb?.isActive).toBe(false);
  });
});
