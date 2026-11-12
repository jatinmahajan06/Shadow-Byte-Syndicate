export type TeamCategory =
  | "Institutional Leadership"
  | "Faculty Coordination"
  | "Tech Team"
  | "Management Team"
  | "Design Team"
  | "Video & Photo Team";

export interface LeadershipTeamMember {
  id: string;
  name: string;
  designation: string;
  imagePath: string | null;
  category: "Institutional Leadership" | "Faculty Coordination";
}

export type GeneralTeamCategory =
  | "Tech Team"
  | "Management Team"
  | "Design Team"
  | "Video & Photo Team";

export interface TeamMemberProfile {
  id: string;
  name: string;
  imagePath: string | null;
  category: GeneralTeamCategory;
  designation?: never;
}

export type TechTeamMember = TeamMemberProfile;
export type TeamMemberEntry = LeadershipTeamMember | TeamMemberProfile;

export const INSTITUTIONAL_LEADERSHIP: readonly LeadershipTeamMember[] = [
  {
    id: "pramod-patil",
    name: "Pramod Patil",
    designation: "Director",
    imagePath: "/team/Pramod-Patil.jpg",
    category: "Institutional Leadership",
  },
  {
    id: "tushar-waykole",
    name: "Tushar Waykole",
    designation: "Head of Department (HOD)",
    imagePath: "/team/Tushar-Waykole.jpg",
    category: "Institutional Leadership",
  },
];

export const FACULTY_COORDINATION: readonly LeadershipTeamMember[] = [
  {
    id: "gajanan-godse",
    name: "Gajanan Godse",
    designation: "Faculty Coordinator",
    imagePath: "/team/Gajanan-Godse.jpg",
    category: "Faculty Coordination",
  },
];

/**
 * Tech Team (9 members — equal importance, no posts/designations).
 * Expected future asset paths under public/team/:
 * - Aakansha Dabhade -> /team/Aakansha-Dabhade.jpg
 * - Keeth Chirammal  -> /team/Keeth-Chirammal.jpg
 */
export const TECH_TEAM: readonly TeamMemberProfile[] = [
  {
    id: "ajinkya-ambare",
    name: "Ajinkya Ambare",
    imagePath: "/team/Ajinkya-Ambare.jpg",
    category: "Tech Team",
  },
  {
    id: "chadar-meheta",
    name: "Chadar Meheta",
    imagePath: "/team/Chadar-Meheta.jpg",
    category: "Tech Team",
  },
  {
    id: "jatin-mahajan",
    name: "Jatin Mahajan",
    imagePath: "/team/Jatin-Mahajan.jpg",
    category: "Tech Team",
  },
  {
    id: "madhura-katre",
    name: "Madhura Katre",
    imagePath: "/team/Madhura-Katre.jpg",
    category: "Tech Team",
  },
  {
    id: "parimal-kshirsagar",
    name: "Parimal Kshirsagar",
    imagePath: "/team/Parimal-Kshirsagar.jpg",
    category: "Tech Team",
  },
  {
    id: "rupesh-patil",
    name: "Rupesh Patil",
    imagePath: "/team/Rupesh-Patil.jpg",
    category: "Tech Team",
  },
  {
    id: "yadhnesh-gandhele",
    name: "Yadhnesh Gandhele",
    imagePath: "/team/Yadhnesh-Gandhele.jpg",
    category: "Tech Team",
  },
  {
    id: "aakansha-dabhade",
    name: "Aakansha Dabhade",
    imagePath: null,
    category: "Tech Team",
  },
  {
    id: "keeth-chirammal",
    name: "Keeth Chirammal",
    imagePath: null,
    category: "Tech Team",
  },
];

/**
 * Management Team (6 members — equal importance, no posts/designations).
 * Expected future asset paths under public/team/:
 * - Riya Ingale      -> /team/Riya-Ingale.jpg
 * - Omkar Chaudhari  -> /team/Omkar-Chaudhari.jpg
 * - Prathamesh Patil -> /team/Prathamesh-Patil.jpg
 * - Kartik Patil     -> /team/Kartik-Patil.jpg
 * - Sanchita Rajesh  -> /team/Sanchita-Rajesh.jpg
 * - Tejas Banlode    -> /team/Tejas-Banlode.jpg
 */
export const MANAGEMENT_TEAM: readonly TeamMemberProfile[] = [
  {
    id: "riya-ingale",
    name: "Riya Ingale",
    imagePath: null,
    category: "Management Team",
  },
  {
    id: "omkar-chaudhari",
    name: "Omkar Chaudhari",
    imagePath: null,
    category: "Management Team",
  },
  {
    id: "prathamesh-patil",
    name: "Prathamesh Patil",
    imagePath: null,
    category: "Management Team",
  },
  {
    id: "kartik-patil",
    name: "Kartik Patil",
    imagePath: null,
    category: "Management Team",
  },
  {
    id: "sanchita-rajesh",
    name: "Sanchita Rajesh",
    imagePath: null,
    category: "Management Team",
  },
  {
    id: "tejas-banlode",
    name: "Tejas Banlode",
    imagePath: null,
    category: "Management Team",
  },
];

/**
 * Design Team (5 members — equal importance, no posts/designations).
 * Expected future asset paths under public/team/:
 * - Gayatri Antad    -> /team/Gayatri-Antad.jpg
 * - Kanishka Jangale -> /team/Kanishka-Jangale.jpg
 * - Trupti Burungale -> /team/Trupti-Burungale.jpg
 * - Deepika Shinde   -> /team/Deepika-Shinde.jpg
 * - Shruti Surve     -> /team/Shruti-Surve.jpg
 */
export const DESIGN_TEAM: readonly TeamMemberProfile[] = [
  {
    id: "gayatri-antad",
    name: "Gayatri Antad",
    imagePath: null,
    category: "Design Team",
  },
  {
    id: "kanishka-jangale",
    name: "Kanishka Jangale",
    imagePath: null,
    category: "Design Team",
  },
  {
    id: "trupti-burungale",
    name: "Trupti Burungale",
    imagePath: null,
    category: "Design Team",
  },
  {
    id: "deepika-shinde",
    name: "Deepika Shinde",
    imagePath: null,
    category: "Design Team",
  },
  {
    id: "shruti-surve",
    name: "Shruti Surve",
    imagePath: null,
    category: "Design Team",
  },
];

/**
 * Video & Photo Team (2 members — equal importance, no posts/designations).
 * Expected future asset paths under public/team/:
 * - Tanvi Patil -> /team/Tanvi-Patil.jpg
 * - Tuba Mulani -> /team/Tuba-Mulani.jpg
 */
export const VIDEO_PHOTO_TEAM: readonly TeamMemberProfile[] = [
  {
    id: "tanvi-patil",
    name: "Tanvi Patil",
    imagePath: null,
    category: "Video & Photo Team",
  },
  {
    id: "tuba-mulani",
    name: "Tuba Mulani",
    imagePath: null,
    category: "Video & Photo Team",
  },
];

export const TEAM_DIRECTORY = {
  institutionalLeadership: INSTITUTIONAL_LEADERSHIP,
  facultyCoordination: FACULTY_COORDINATION,
  techTeam: TECH_TEAM,
  managementTeam: MANAGEMENT_TEAM,
  designTeam: DESIGN_TEAM,
  videoPhotoTeam: VIDEO_PHOTO_TEAM,
} as const;

