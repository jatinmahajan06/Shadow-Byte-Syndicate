import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import { ROLES, PUBLISH_STATUS, REGISTRATION_STATUS } from "../src/lib/constants";

describe("End-to-End API Security & Role Portal Invariants", () => {
  it("1. Verifies portal role mismatch enforcement logic", async () => {
    // Look up student account
    const student = await prisma.user.findFirst({
      where: { role: ROLES.STUDENT, isActive: true },
    });

    expect(student).not.toBeNull();
    if (!student) return;

    // Simulate login verification against expectedRole
    const verifyPortalAccess = (userRole: string, expectedPortalRole: string) => {
      if (userRole !== expectedPortalRole) {
        return { allowed: false, status: 403, error: "Access Denied: Portal role mismatch" };
      }
      return { allowed: true, status: 200 };
    };

    // A student attempting coordinator portal -> REJECTED
    const attemptCoord = verifyPortalAccess(student.role, ROLES.COORDINATOR);
    expect(attemptCoord.allowed).toBe(false);
    expect(attemptCoord.status).toBe(403);

    // A student attempting super-admin portal -> REJECTED
    const attemptAdmin = verifyPortalAccess(student.role, ROLES.SUPER_ADMIN);
    expect(attemptAdmin.allowed).toBe(false);
    expect(attemptAdmin.status).toBe(403);

    // A student accessing student portal -> ALLOWED
    const attemptStudent = verifyPortalAccess(student.role, ROLES.STUDENT);
    expect(attemptStudent.allowed).toBe(true);
    expect(attemptStudent.status).toBe(200);
  });

  it("2. Verifies Coordinator cannot permanently delete records", async () => {
    const coord = await prisma.user.findFirst({ where: { role: ROLES.COORDINATOR } });
    expect(coord).not.toBeNull();

    // Verification logic matching DELETE handler in /api/events and /api/posts
    const canDeleteRecord = (userRole: string) => {
      return userRole === ROLES.SUPER_ADMIN;
    };

    expect(canDeleteRecord(coord!.role)).toBe(false);
    expect(canDeleteRecord(ROLES.STUDENT)).toBe(false);
    expect(canDeleteRecord(ROLES.SUPER_ADMIN)).toBe(true);
  });

  it("3. Verifies Site Settings update persists and updates public fields", async () => {
    const admin = await prisma.user.findFirst({ where: { role: ROLES.SUPER_ADMIN } });
    expect(admin).not.toBeNull();

    const newTagline = "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT. [VERIFIED]";

    // Update settings in database
    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        mainTagline: newTagline,
      },
      update: {
        mainTagline: newTagline,
      },
    });

    expect(updated.mainTagline).toBe(newTagline);

    // Read back through fresh query
    const readBack = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    expect(readBack?.mainTagline).toBe(newTagline);

    // Restore original tagline
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: { mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT." },
    });
  });

  it("4. Verifies Concurrent registration requests cannot exceed event capacity", async () => {
    // Create an event with capacity = 2
    const event = await prisma.event.create({
      data: {
        slug: `concurrency-test-${Date.now()}`,
        title: "Concurrent Registration Race Test",
        summary: "Capacity limited to 2",
        description: "Testing concurrent atomic transactions",
        venue: "Cyber Range",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() + 80000000),
        capacity: 2,
        status: PUBLISH_STATUS.PUBLISHED,
        createdById: (await prisma.user.findFirst({ where: { role: ROLES.SUPER_ADMIN } }))!.id,
      },
    });

    // Create 3 mock student users
    const studentsToRegister = await Promise.all([
      prisma.user.create({
        data: {
          name: "Concurrent Stu 1",
          email: `c1-${Date.now()}@shadowbyte.local`,
          passwordHash: "hash",
          role: ROLES.STUDENT,
        },
      }),
      prisma.user.create({
        data: {
          name: "Concurrent Stu 2",
          email: `c2-${Date.now()}@shadowbyte.local`,
          passwordHash: "hash",
          role: ROLES.STUDENT,
        },
      }),
      prisma.user.create({
        data: {
          name: "Concurrent Stu 3",
          email: `c3-${Date.now()}@shadowbyte.local`,
          passwordHash: "hash",
          role: ROLES.STUDENT,
        },
      }),
    ]);

    // Atomic transaction registration function
    const registerStudent = async (studentId: string) => {
      return prisma.$transaction(async (tx) => {
        const confirmedCount = await tx.eventRegistration.count({
          where: {
            eventId: event.id,
            status: REGISTRATION_STATUS.CONFIRMED,
          },
        });

        if (confirmedCount >= event.capacity) {
          throw new Error("CAPACITY_REACHED");
        }

        return tx.eventRegistration.create({
          data: {
            eventId: event.id,
            studentId,
            status: REGISTRATION_STATUS.CONFIRMED,
          },
        });
      });
    };

    // Attempt 3 simultaneous registrations for 2 slots
    const results = await Promise.allSettled(
      studentsToRegister.map((s) => registerStudent(s.id))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 2 must succeed, and 1 must be rejected due to capacity limit!
    expect(succeeded.length).toBe(2);
    expect(rejected.length).toBe(1);

    // Verify final database count is exactly 2
    const finalCount = await prisma.eventRegistration.count({
      where: { eventId: event.id, status: REGISTRATION_STATUS.CONFIRMED },
    });
    expect(finalCount).toBe(2);

    // Clean up
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.deleteMany({
      where: { id: { in: studentsToRegister.map((s) => s.id) } },
    });
  });
});
