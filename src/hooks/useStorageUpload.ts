"use client";

import { useState, useCallback } from "react";
import {
  uploadImageWithProgress,
  StorageFolder,
  UploadResult,
} from "@/firebase/storage";
import { useAuth } from "./useAuth";

export function useStorageUpload() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File, folder: StorageFolder): Promise<UploadResult> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Attempt direct Firebase Storage client upload when authenticated with Firebase Client SDK
        const result = await uploadImageWithProgress(
          file,
          folder,
          profile?.uid,
          (pct) => setProgress(pct)
        );
        setProgress(100);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [profile?.uid]
  );

  return { uploadFile, uploading, progress, error, setError };
}

