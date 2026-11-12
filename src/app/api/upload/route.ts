import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.COORDINATOR) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to upload assets." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) || "events";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only sanitized JPEG, PNG, and WebP images are permitted. SVG and executable formats are strictly rejected.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let ext = ".jpg";
    if (file.type === "image/png") ext = ".png";
    if (file.type === "image/webp") ext = ".webp";

    const safeFolder = ["events", "posts", "team", "gallery", "branding"].includes(folder)
      ? folder
      : "events";

    if (
      user.role === ROLES.COORDINATOR &&
      safeFolder !== "events" &&
      safeFolder !== "posts"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Coordinators may only upload validated images for events and posts.",
        },
        { status: 403 }
      );
    }

    const safeFilename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`;
    const objectPath =
      safeFolder === "events" || safeFolder === "posts"
        ? `uploads/${safeFolder}/${user.uid}/${safeFilename}`
        : `uploads/${safeFolder}/${safeFilename}`;

    const bucket = getAdminStorage().bucket();
    const fileRef = bucket.file(objectPath);
    const downloadToken = crypto.randomUUID();

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          uploadedBy: user.uid,
        },
      },
    });

    const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
    const emulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199";
    const encodedPath = encodeURIComponent(objectPath);

    const publicUrl = useEmulators
      ? `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`
      : `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: objectPath,
      filename: safeFilename,
      size: file.size,
    });
  } catch (error) {
    console.error("[Firebase Storage Upload API Error]", error);
    return NextResponse.json({ error: "Failed to upload file to Firebase Storage." }, { status: 500 });
  }
}
