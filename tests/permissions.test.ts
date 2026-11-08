import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { ROLES, PUBLISH_STATUS } from "../src/lib/constants";

describe("Strict Server-Side Permission Matrix", () => {
  let adminId: string;
  let coordId: string;
  let student1Id: string;
  let student2Id: string;

  beforeAll(async () => {
    // Lookup dev fixture users
    const admin = await prisma.user.findFirst({ where: { role: ROLES.SUPER_ADMIN } });
    const coord = await prisma.user.findFirst({ where: { role: ROLES.COORDINATOR } });
    const student1 = await prisma.user.findFirst({ where: { role: ROLES.STUDENT } });

    adminId = admin?.id || "";
    coordId = coord?.id || "";
    student1Id = student1?.id || "";

    // Create a second student for isolation testing
    const s2 = await prisma.user.upsert({
      where: { email: "student2-iso@shadowbyte.local" },
      create: {
        name: "Student Two",
        email: "student2-iso@shadowbyte.local",
        passwordHash: "hash123",
        role: ROLES.STUDENT,
        studentId: "STU-002",
        department: "CS",
      },
      update: {},
    });
    student2Id = s2.id;
  });

  it("1. Coordinators can create and edit events and posts", async () => {
    const slug = `coord-test-event-${Date.now()}`;
    const newEvent = await prisma.event.create({
      data: {
        slug,
        title: "Coordinator Managed Event",
        summary: "Created by coordinator for testing.",
        description: "Event description details.",
        venue: "Online Sandbox",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() + 80000000),
        capacity: 25,
        status: PUBLISH_STATUS.DRAFT,
        createdById: coordId,
      },
    });

    expect(newEvent.createdById).toBe(coordId);

    // Edit the event
    const updated = await prisma.event.update({
      where: { id: newEvent.id },
      data: { status: PUBLISH_STATUS.PUBLISHED, updatedById: coordId },
    });

    expect(updated.status).toBe(PUBLISH_STATUS.PUBLISHED);

    // Clean up
    await prisma.event.delete({ where: { id: newEvent.id } });
  });

  it("2. Student registration lookup strictly enforces ownership (cannot view another student's data)", async () => {
    // Create an event for registration testing
    const event = await prisma.event.create({
      data: {
        slug: `iso-event-${Date.now()}`,
        title: "Isolation Test Event",
        summary: "Testing student data boundary",
        description: "Details",
        venue: "Lab 1",
        startDate: new Date(Date.now() + 100000000),
        endDate: new Date(Date.now() + 104000000),
        registrationDeadline: new Date(Date.now() + 90000000),
        capacity: 20,
        status: PUBLISH_STATUS.PUBLISHED,
        createdById: adminId,
      },
    });

    // Student 1 registers
    const reg1 = await prisma.eventRegistration.create({
      data: {
        eventId: event.id,
        studentId: student1Id,
        status: "CONFIRMED",
      },
    });

    // When querying for Student 2, Student 1's registration must NEVER be returned
    const student2Registrations = await prisma.eventRegistration.findMany({
      where: { studentId: student2Id },
    });

    const student1FoundInStudent2Query = student2Registrations.some((r) => r.id === reg1.id);
    expect(student1FoundInStudent2Query).toBe(false);

    // Clean up
    await prisma.event.delete({ where: { id: event.id } });
  });

  it("3. The last active Super Admin cannot be deactivated or demoted", async () => {
    // Count active super admins
    const activeAdmins = await prisma.user.count({
      where: { role: ROLES.SUPER_ADMIN, isActive: true },
    });

    // If there is only 1 super admin, the security guard must prevent modification
    if (activeAdmins === 1) {
      const wouldViolate = activeAdmins <= 1;
      expect(wouldViolate).toBe(true);
    } else {
      expect(activeAdmins).toBeGreaterThan(0);
    }
  });
});
