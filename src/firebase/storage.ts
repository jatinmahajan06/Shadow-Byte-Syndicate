"use client";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirebaseClient } from "./config";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type StorageFolder =
  | "events"
  | "posts"
  | "avatars"
  | "team"
  | "gallery"
  | "branding";

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

/**
 * Validates file type & size before attempting upload.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Invalid file type. Only JPEG, PNG, and WebP images are permitted. SVG and executables are rejected.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `File exceeds maximum allowed size of 5 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`;
  }
  return null;
}

/**
 * Generates a unique storage object path respecting user-isolated permissions.
 */
export function buildStoragePath(
  folder: StorageFolder,
  file: File,
  uid?: string
): string {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const safeName = `${Date.now()}-${randomId}.${ext}`;

  if (folder === "events" || folder === "posts" || folder === "avatars") {
    if (!uid) {
      throw new Error(`Authenticated UID is required for ${folder} uploads.`);
    }
    return `uploads/${folder}/${uid}/${safeName}`;
  }

  return `uploads/${folder}/${safeName}`;
}

/**
 * Uploads an image directly to Firebase Storage with live upload progress (0..100).
 */
export function uploadImageWithProgress(
  file: File,
  folder: StorageFolder,
  uid: string | undefined,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    try {
      const { storage } = getFirebaseClient();
      const storagePath = buildStoragePath(folder, file, uid);
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid || "system",
          originalName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80),
        },
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            onProgress?.(pct);
          }
        },
        (error) => {
          reject(
            new Error(
              error.code === "storage/unauthorized"
                ? "Permission denied by Firebase Storage Security Rules."
                : error.message || "Storage upload failed."
            )
          );
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url,
              path: storagePath,
              size: file.size,
              contentType: file.type,
            });
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes an uploaded object from Firebase Storage by its download URL or storage path.
 */
export async function deleteStorageObject(urlOrPath: string): Promise<void> {
  if (!urlOrPath || urlOrPath.startsWith("/assets/")) return;

  const { storage } = getFirebaseClient();
  const storageRef = ref(storage, urlOrPath);
  await deleteObject(storageRef);
}

