"use client";

import React from "react";
import Image from "next/image";

export type AsterMood =
  | "neutral"
  | "happy"
  | "thinking"
  | "curious"
  | "concerned"
  | "playful"
  | "focused"
  | "proud"
  | "sleeping"
  | "peeking";

interface AsterAvatarProps {
  mood?: AsterMood;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  onClick?: () => void;
}

const ASTER_MOOD_MAP: Record<AsterMood, string> = {
  neutral: "/aster/aster_neutral.png",
  happy: "/aster/aster_happy.png",
  thinking: "/aster/aster_thinking.png",
  curious: "/aster/aster_curious.png",
  concerned: "/aster/aster_concerned.png",
  playful: "/aster/aster_playful.png",
  focused: "/aster/aster_focused.png",
  proud: "/aster/aster_proud.png",
  sleeping: "/aster/aster_sleeping.png",
  peeking: "/aster/aster_peeking.png",
};

const SIZE_MAP = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-11 h-11",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function AsterAvatar({
  mood = "neutral",
  size = "md",
  className = "",
  showStatus = false,
  onClick,
}: AsterAvatarProps) {
  const src = ASTER_MOOD_MAP[mood] || ASTER_MOOD_MAP.neutral;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${onClick ? "cursor-pointer pressable" : ""} ${className}`}
    >
      <div
        className={`${SIZE_MAP[size]} rounded-full overflow-hidden border border-[#3A3F4D]/60 bg-[#16181D] flex items-center justify-center shadow-sm relative`}
      >
        <Image
          src={src}
          alt={`Aster (${mood})`}
          width={96}
          height={96}
          className="w-full h-full object-cover select-none"
          priority
        />
      </div>

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#16181D] ${
            mood === "concerned"
              ? "bg-rose-500"
              : mood === "thinking"
              ? "bg-amber-400"
              : "bg-emerald-500"
          }`}
        />
      )}
    </div>
  );
}
