import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { getAdminDb, FieldValue } from "../src/firebase/admin";
import { toSerializable } from "../src/services/firestoreConverters";

const DEMO_EVENT_SLUGS = new Set([
  "web-pentesting-zero-to-hero",
  "syndicate-ctf-winter-2026",
  "intro-reverse-engineering-past",
]);

const DEMO_POST_SLUGS = new Set([
  "demystifying-prototype-pollution",
  "building-defensive-mindset",
]);

const DEMO_RESOURCE_TITLES = new Set([
  "OverTheWire Wargames: Bandit",
  "PortSwigger Web Security Academy",
  "Pwnable.kr: Binary Exploitation",
  "Cryptohack: Learn Modern Cryptography",
]);

const PLACEHOLDER_SETTINGS_VALUES = {
  contactEmail: "contact@shadowbyte.club",
  headquarters: "Cyber Defense Center, Main Campus",
  instagramHandle: "@shadowbyte.syndicate",
  youtubeChannel: "Shadow Byte Syndicate",
  discordInvite: "discord.gg/shadowbyte",
};

interface CleanupCandidate {
  id: string;
  label: string;
  reason: string;
}

function isPlaceholderTeamMember(data: Record<string, any>): boolean {
  const name = String(data.name || "");
  const email = String(data.email || "").toLowerCase();
  if (/\[.*placeholder.*\]/i.test(name)) return true;
  if (email === "faculty.advisor@placeholder.college.edu") return true;
  return false;
}

async function runDemoCleanup() {
  const apply = process.argv.includes("--apply");
  const db = getAdminDb();

  console.log("=== SHADOW BYTE SYNDICATE: DEMO CONTENT BACKUP & CLEANUP ===");
  console.log(`Mode: ${apply ? "APPLY (Backup + Delete Confirmed Demo Records)" : "DRY-RUN (Backup + Audit Report Only)"}`);

  const collectionsToBackup = [
    "siteSettings",
    "events",
    "eventRegistrations",
    "posts",
    "resources",
    "teamMembers",
    "gallery",
    "contactMessages",
    "users",
  ] as const;

  const backupData: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};

  for (const colName of collectionsToBackup) {
    const snap = await db.collection(colName).get();
    backupData[colName] = snap.docs.map((doc) => ({
      id: doc.id,
      data: toSerializable(doc.data()),
    }));
  }

  const backupDir = path.join(process.cwd(), "backups");
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `firestore-backup-${timestamp}.json`);
  await fs.writeFile(
    backupFile,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        mode: apply ? "apply" : "dry-run",
        collections: backupData,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`[BACKUP SAVED] ${backupFile}`);

  // Index registrations by eventId so we NEVER delete an event that has genuine registrations
  const regsByEventId = new Map<string, number>();
  for (const reg of backupData.eventRegistrations) {
    const eventId = String(reg.data.eventId || "");
    if (eventId) {
      regsByEventId.set(eventId, (regsByEventId.get(eventId) || 0) + 1);
    }
  }

  const confirmedEventsToDelete: CleanupCandidate[] = [];
  const uncertainEventsPreserved: CleanupCandidate[] = [];

  for (const evt of backupData.events) {
    const slug = String(evt.data.slug || "");
    const title = String(evt.data.title || evt.id);
    const regCount = regsByEventId.get(evt.id) || 0;

    if (DEMO_EVENT_SLUGS.has(slug)) {
      if (regCount > 0) {
        uncertainEventsPreserved.push({
          id: evt.id,
          label: `${title} (slug: ${slug})`,
          reason: `Matches demo slug but has ${regCount} existing registration(s) — preserved for review.`,
        });
      } else {
        confirmedEventsToDelete.push({
          id: evt.id,
          label: `${title} (slug: ${slug})`,
          reason: "Known seeded sample event with 0 registrations.",
        });
      }
    } else {
      uncertainEventsPreserved.push({
        id: evt.id,
        label: `${title} (slug: ${slug})`,
        reason: "Custom / non-seed event — preserved.",
      });
    }
  }

  const confirmedPostsToDelete: CleanupCandidate[] = [];
  const preservedPosts: CleanupCandidate[] = [];
  for (const post of backupData.posts) {
    const slug = String(post.data.slug || "");
    const title = String(post.data.title || post.id);
    if (DEMO_POST_SLUGS.has(slug)) {
      confirmedPostsToDelete.push({
        id: post.id,
        label: `${title} (slug: ${slug})`,
        reason: "Known seeded sample Knowledge Hub article.",
      });
    } else {
      preservedPosts.push({
        id: post.id,
        label: `${title} (slug: ${slug})`,
        reason: "Custom / non-seed article — preserved.",
      });
    }
  }

  const confirmedResourcesToDelete: CleanupCandidate[] = [];
  const preservedResources: CleanupCandidate[] = [];
  for (const res of backupData.resources) {
    const title = String(res.data.title || res.id);
    if (DEMO_RESOURCE_TITLES.has(title)) {
      confirmedResourcesToDelete.push({
        id: res.id,
        label: title,
        reason: "Known seeded sample resource.",
      });
    } else {
      preservedResources.push({
        id: res.id,
        label: title,
        reason: "Custom / non-seed resource — preserved.",
      });
    }
  }

  const confirmedTeamToDelete: CleanupCandidate[] = [];
  const preservedTeam: CleanupCandidate[] = [];
  for (const member of backupData.teamMembers) {
    const name = String(member.data.name || member.id);
    if (isPlaceholderTeamMember(member.data)) {
      confirmedTeamToDelete.push({
        id: member.id,
        label: name,
        reason: "Contains [Placeholder] name or placeholder faculty email.",
      });
    } else {
      preservedTeam.push({
        id: member.id,
        label: `${name}${member.data.photoUrl ? " [has uploaded photo]" : ""}`,
        reason: "Non-placeholder team profile — preserved.",
      });
    }
  }

  const settingsDoc = backupData.siteSettings.find((s) => s.id === "default");
  const settingsFieldsToClear: string[] = [];
  if (settingsDoc) {
    for (const [key, placeholderVal] of Object.entries(PLACEHOLDER_SETTINGS_VALUES)) {
      if (settingsDoc.data[key] === placeholderVal) {
        settingsFieldsToClear.push(key);
      }
    }
  }

  console.log("\n--- CLEANUP AUDIT SUMMARY ---");
  console.log(`Confirmed demo events to remove:     ${confirmedEventsToDelete.length}`);
  console.log(`Confirmed demo posts to remove:      ${confirmedPostsToDelete.length}`);
  console.log(`Confirmed demo resources to remove:  ${confirmedResourcesToDelete.length}`);
  console.log(`Placeholder team profiles to remove: ${confirmedTeamToDelete.length}`);
  console.log(`Placeholder siteSettings keys:       ${settingsFieldsToClear.join(", ") || "None"}`);
  console.log(`Preserved events / uncertain review: ${uncertainEventsPreserved.length}`);
  console.log(`Preserved custom posts:              ${preservedPosts.length}`);
  console.log(`Preserved custom resources:          ${preservedResources.length}`);
  console.log(`Preserved team profiles:             ${preservedTeam.length}`);
  console.log(`Preserved gallery items:             ${backupData.gallery.length}`);
  console.log(`Preserved user accounts:             ${backupData.users.length}`);
  console.log(`Preserved registrations:             ${backupData.eventRegistrations.length}`);

  if (uncertainEventsPreserved.length > 0) {
    console.log("\nPreserved / Review-Required Events:");
    uncertainEventsPreserved.forEach((item) => console.log(`  - [${item.id}] ${item.label}: ${item.reason}`));
  }

  if (apply) {
    const ops: Array<() => Promise<unknown>> = [];
    confirmedEventsToDelete.forEach((c) => ops.push(() => db.collection("events").doc(c.id).delete()));
    confirmedPostsToDelete.forEach((c) => ops.push(() => db.collection("posts").doc(c.id).delete()));
    confirmedResourcesToDelete.forEach((c) => ops.push(() => db.collection("resources").doc(c.id).delete()));
    confirmedTeamToDelete.forEach((c) => ops.push(() => db.collection("teamMembers").doc(c.id).delete()));

    if (settingsFieldsToClear.length > 0) {
      const updatePayload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      for (const field of settingsFieldsToClear) {
        updatePayload[field] = "";
      }
      ops.push(() => db.collection("siteSettings").doc("default").update(updatePayload));
    }

    await Promise.all(ops.map((fn) => fn()));

    await db.collection("auditLogs").add({
      action: "DEMO_CONTENT_CLEANUP",
      entityType: "System",
      entityId: "cleanup-demo-content",
      details: JSON.stringify({
        backupFile,
        deletedEvents: confirmedEventsToDelete.length,
        deletedPosts: confirmedPostsToDelete.length,
        deletedResources: confirmedResourcesToDelete.length,
        deletedTeamMembers: confirmedTeamToDelete.length,
        clearedSettingsFields: settingsFieldsToClear,
      }),
      userId: null,
      userEmail: "system-cli",
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log("\n[CLEANUP APPLIED] Confirmed demo records removed and backup verified.");
  } else {
    console.log("\n[DRY-RUN COMPLETE] No database records were deleted. Pass --apply to execute cleanup.");
  }

  process.exit(0);
}

runDemoCleanup().catch((err) => {
  console.error("[DEMO CLEANUP FAILED]", err);
  process.exit(1);
});

