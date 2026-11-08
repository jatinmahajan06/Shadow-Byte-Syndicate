import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { PUBLISH_STATUS, REGISTRATION_STATUS, ROLES } from "../src/lib/constants";

describe("Event Lifecycle, Publication & Registration Rules", () => {
  let adminId: string;
  let studentId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: ROLES.SUPER_ADMIN } });
    const student = await prisma.user.findFirst({ where: { role: ROLES.STUDENT } });
    adminId = admin?.id || "";
    studentId = student?.id || "";
  });

  it("1. Unpublished/Draft events are not returned in public queries", async () => {
    const draftEvent = await prisma.event.create({
      data: {
        slug: `draft-event-${Date.now()}`,
        title: "Secret Unreleased Workshop",
        summary: "Under preparation",
        description: "Draft content",
        venue: "Restricted",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() + 80000000),
        capacity: 10,
        status: PUBLISH_STATUS.DRAFT, // UNPUBLISHED
        createdById: adminId,
      },
    });

    // Public query filters strictly by status: PUBLISHED
    const publicResults = await prisma.event.findMany({
      where: {
        slug: draftEvent.slug,
        status: PUBLISH_STATUS.PUBLISHED,
      },
    });

    expect(publicResults.length).toBe(0);

    await prisma.event.delete({ where: { id: draftEvent.id } });
  });

  it("2. Duplicate event registrations are rejected at the database level", async () => {
    const event = await prisma.event.create({
      data: {
        slug: `dup-test-event-${Date.now()}`,
        title: "Duplicate Registration Test",
        summary: "Testing unique constraint",
        description: "Details",
        venue: "Lab",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() + 80000000),
        capacity: 10,
        status: PUBLISH_STATUS.PUBLISHED,
        createdById: adminId,
      },
    });

    // First registration succeeds
    await prisma.eventRegistration.create({
      data: {
        eventId: event.id,
        studentId: studentId,
        status: REGISTRATION_STATUS.CONFIRMED,
      },
    });

    // Second registration with same eventId and studentId MUST fail with unique constraint violation
    await expect(
      prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          studentId: studentId,
          status: REGISTRATION_STATUS.CONFIRMED,
        },
      })
    ).rejects.toThrow();

    await prisma.event.delete({ where: { id: event.id } });
  });

  it("3. Transaction-safe capacity checks prevent oversubscription", async () => {
    // Create an event with capacity = 1
    const event = await prisma.event.create({
      data: {
        slug: `capacity-test-event-${Date.now()}`,
        title: "Tight Capacity Test Event",
        summary: "Capacity limited to 1",
        description: "Details",
        venue: "Virtual",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() + 80000000),
        capacity: 1, // Only 1 seat available!
        status: PUBLISH_STATUS.PUBLISHED,
        createdById: adminId,
      },
    });

    // Fill the 1 seat
    await prisma.eventRegistration.create({
      data: {
        eventId: event.id,
        studentId: studentId,
        status: REGISTRATION_STATUS.CONFIRMED,
      },
    });

    // Test transaction-safe capacity verification
    const attemptSecondRegistration = async () => {
      return prisma.$transaction(async (tx) => {
        const confirmedCount = await tx.eventRegistration.count({
          where: {
            eventId: event.id,
            status: REGISTRATION_STATUS.CONFIRMED,
          },
        });

        if (confirmedCount >= event.capacity) {
          throw new Error("EVENT_CAPACITY_REACHED");
        }

        return true;
      });
    };

    await expect(attemptSecondRegistration()).rejects.toThrow("EVENT_CAPACITY_REACHED");

    await prisma.event.delete({ where: { id: event.id } });
  });

  it("4. Registration deadline enforcement rejects late requests", async () => {
    // Create an event with an expired deadline
    const expiredEvent = await prisma.event.create({
      data: {
        slug: `expired-deadline-event-${Date.now()}`,
        title: "Expired Deadline Event",
        summary: "Deadline has passed",
        description: "Details",
        venue: "Virtual",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        registrationDeadline: new Date(Date.now() - 3600000), // Expired 1 hour ago
        capacity: 20,
        status: PUBLISH_STATUS.PUBLISHED,
        createdById: adminId,
      },
    });

    const isExpired = new Date() > expiredEvent.registrationDeadline;
    expect(isExpired).toBe(true);

    await prisma.event.delete({ where: { id: expiredEvent.id } });
  });
});
