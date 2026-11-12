export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  COORDINATOR: "COORDINATOR",
  STUDENT: "STUDENT",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PUBLISH_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
  CANCELLED: "CANCELLED",
} as const;

export type PublishStatusType = (typeof PUBLISH_STATUS)[keyof typeof PUBLISH_STATUS];

export const EVENT_MODES = {
  IN_PERSON: "IN_PERSON",
  VIRTUAL: "VIRTUAL",
  HYBRID: "HYBRID",
} as const;

export const REGISTRATION_STATUS = {
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  ATTENDED: "ATTENDED",
} as const;

export const BRAND = {
  name: "SHADOW BYTE SYNDICATE",
  shortName: "SBS",
  supportingLine: "HACK • RESEARCH • INNOVATE • SECURE",
  mainTagline: "WE DON’T FOLLOW THE SYSTEM, WE SECURE IT.",
  secondaryPhrase: "BEYOND FIREWALLS",
  heroTerminalLines: [
    ">> INITIALIZING...",
    ">> CONNECTING TO CYBER DEFENSE NETWORK...",
    ">> ACCESS GRANTED: WELCOME TO SHADOW BYTE SYNDICATE.",
  ],
  socials: {
    instagram: "",
    youtube: "",
    discord: "",
  },
  assets: {
    banner: "/assets/brand/banner.jpeg",
    shield: "/assets/brand/shield-emblem.png",
  },
};

