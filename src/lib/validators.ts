import { z } from "zod";
import { ROLES, PUBLISH_STATUS, EVENT_MODES } from "./constants";

const httpUrlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://");

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  expectedRole: z.enum([ROLES.SUPER_ADMIN, ROLES.COORDINATOR, ROLES.STUDENT]),
});

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(20, "Invalid authentication token"),
  expectedRole: z.enum([ROLES.SUPER_ADMIN, ROLES.COORDINATOR, ROLES.STUDENT]),
});

export const firebaseGoogleAuthSchema = z.object({
  idToken: z.string().min(20, "Invalid Google authentication token"),
  expectedRole: z.enum([ROLES.SUPER_ADMIN, ROLES.COORDINATOR, ROLES.STUDENT]),
});

export const firebaseStudentRegisterSchema = z.object({
  idToken: z.string().min(20, "Invalid authentication token"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  studentId: z.string().trim().min(2, "Student ID / Roll number is required").max(50),
  department: z.string().trim().min(2, "Department / Branch is required").max(100),
  phone: z.string().trim().max(20).optional(),
});

export const studentRegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid college/personal email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  studentId: z.string().trim().min(2, "Student ID / Roll number is required").max(50),
  department: z.string().trim().min(2, "Department / Branch is required").max(100),
  phone: z.string().trim().max(20).optional(),
});

export const coordinatorCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  department: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
});

export const eventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and dashes"),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters").max(500),
  description: z.string().trim().min(20, "Description must be at least 20 characters"),
  bannerUrl: z.string().trim().optional().nullable(),
  mode: z.enum([EVENT_MODES.IN_PERSON, EVENT_MODES.VIRTUAL, EVENT_MODES.HYBRID]),
  venue: z.string().trim().min(2, "Venue is required").max(200),
  locationUrl: httpUrlSchema.optional().nullable().or(z.literal("")),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  registrationDeadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid registration deadline"),
  capacity: z.coerce.number().int().positive("Capacity must be greater than 0"),
  status: z.enum([
    PUBLISH_STATUS.DRAFT,
    PUBLISH_STATUS.PUBLISHED,
    PUBLISH_STATUS.ARCHIVED,
    PUBLISH_STATUS.CANCELLED,
  ]),
  isRegistrationOpen: z.boolean().default(true),
  category: z.string().trim().default("Workshop"),
});

export const eventStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Event ID is required"),
  status: z.enum([
    PUBLISH_STATUS.DRAFT,
    PUBLISH_STATUS.PUBLISHED,
    PUBLISH_STATUS.ARCHIVED,
    PUBLISH_STATUS.CANCELLED,
  ]),
  isRegistrationOpen: z.boolean().optional(),
});

export const postSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(250),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(250)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and dashes"),
  excerpt: z.string().trim().min(10, "Excerpt must be at least 10 characters").max(500),
  content: z.string().trim().min(20, "Content must be at least 20 characters"),
  coverImage: z.string().trim().optional().nullable(),
  category: z.string().trim().default("Security Research"),
  tags: z.string().trim().optional().nullable(),
  status: z.enum([PUBLISH_STATUS.DRAFT, PUBLISH_STATUS.PUBLISHED, PUBLISH_STATUS.ARCHIVED]),
});

export const postStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Post ID is required"),
  status: z.enum([PUBLISH_STATUS.DRAFT, PUBLISH_STATUS.PUBLISHED, PUBLISH_STATUS.ARCHIVED]),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(100),
  category: z.enum(["FACULTY", "CORE_TEAM", "LEAD", "ADVISOR"]).default("CORE_TEAM"),
  bio: z.string().trim().min(10).max(1000),
  photoUrl: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  githubUrl: httpUrlSchema.optional().nullable().or(z.literal("")),
  linkedinUrl: httpUrlSchema.optional().nullable().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const resourceSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1000),
  category: z.string().trim().min(2).max(100),
  url: httpUrlSchema,
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
  isPublished: z.boolean().default(true),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required"),
  subject: z.string().trim().min(3, "Subject is required").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
});

export const siteSettingsSchema = z.object({
  clubName: z.string().trim().min(2).max(100),
  supportingLine: z.string().trim().min(2).max(150),
  mainTagline: z.string().trim().min(2).max(200),
  secondaryPhrase: z.string().trim().max(100),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid contact email address")
    .or(z.literal(""))
    .default(""),
  headquarters: z.string().trim().max(200).optional().default(""),
  timezone: z.string().trim().min(2),
  instagramHandle: z.string().trim().max(100).default(""),
  youtubeChannel: z.string().trim().max(100).default(""),
  discordInvite: z.string().trim().max(100).default(""),
  bannerUrl: z.string().trim(),
  shieldLogoUrl: z.string().trim(),
  aboutSummary: z.string().trim().min(10),
  ethicsStatement: z.string().trim().min(10),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});
