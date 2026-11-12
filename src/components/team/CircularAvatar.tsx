"use client";

import React, { useState } from "react";
import { User } from "lucide-react";

export type CircularAvatarSize = "sm" | "md" | "lg" | "xl";

interface CircularAvatarProps {
  src?: string | null;
  alt: string;
  size?: CircularAvatarSize;
  variant?: "leadership" | "member";
  className?: string;
}

const SIZE_CLASSES: Record<CircularAvatarSize, string> = {
  sm: "w-14 h-14",
  md: "w-20 h-20 sm:w-24 sm:h-24",
  lg: "w-28 h-28 sm:w-32 sm:h-32",
  xl: "w-32 h-32 sm:w-36 sm:h-36",
};

const ICON_SIZES: Record<CircularAvatarSize, string> = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-11 h-11",
  xl: "w-12 h-12",
};

/**
 * Reusable 1:1 circular profile portrait component.
 * Strictly enforces border-radius: 50%, object-fit: cover, and object-position: center
 * with a clean dark-surface fallback if an image is missing or fails to load.
 */
export default function CircularAvatar({
  src,
  alt,
  size = "lg",
  variant = "member",
  className = "",
}: CircularAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasValidImage = Boolean(src) && failedSrc !== src;

  const borderClasses =
    variant === "leadership"
      ? "border-2 border-brand-red/60 group-hover:border-brand-redBright shadow-red-glow"
      : "border-2 border-brand-red/40 group-hover:border-brand-redBright/90 shadow-red-glow-sm";

  return (
    <div
      className={`relative aspect-square rounded-full overflow-hidden flex-shrink-0 bg-brand-card ${SIZE_CLASSES[size]} ${borderClasses} transition-all duration-300 ${className}`}
      style={{ borderRadius: "50%" }}
    >
      {hasValidImage ? (
        // Native img with strict inline object-fit/position ensures uniform 1:1 circle crop
        // across portrait, square, and landscape source images without Next loader transforms.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          loading="eager"
          decoding="sync"
          onError={() => setFailedSrc(src ?? null)}
          className="w-full h-full block transition-transform duration-300 group-hover:scale-[1.03]"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <div
          data-placeholder="true"
          className="w-full h-full flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(214,17,34,0.18),rgba(13,15,23,0.98)_72%)] text-brand-redBright/75 group-hover:text-brand-redBright transition-colors p-2"
          style={{ borderRadius: "50%" }}
          role="img"
          aria-label={`${alt} placeholder portrait`}
        >
          <div
            className="w-full h-full rounded-full border border-dashed border-brand-red/30 group-hover:border-brand-redBright/50 flex items-center justify-center transition-colors"
            style={{ borderRadius: "50%" }}
          >
            <User className={ICON_SIZES[size]} />
          </div>
        </div>
      )}
    </div>
  );
}
