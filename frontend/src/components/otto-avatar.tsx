"use client";

import React from "react";
import { motion } from "motion/react";

export type OttoMood = "idle" | "thinking" | "alert" | "approved" | "guiding";

interface OttoAvatarProps {
  mood?: OttoMood;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}

export function OttoAvatar({
  mood = "idle",
  size = "md",
  className = "",
  showBadge = false,
}: OttoAvatarProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const glowColorMap = {
    idle: "from-indigo-500/20 to-purple-500/20",
    thinking: "from-cyan-500/30 to-blue-500/30",
    alert: "from-rose-500/30 to-amber-500/30",
    approved: "from-emerald-500/30 to-teal-500/30",
    guiding: "from-violet-500/30 to-fuchsia-500/30",
  };

  const eyeColorMap = {
    idle: "#818CF8",      // Indigo
    thinking: "#38BDF8",  // Sky cyan
    alert: "#FB7185",     // Rose red
    approved: "#34D399",  // Emerald green
    guiding: "#A78BFA",   // Violet
  };

  const eyeColor = eyeColorMap[mood];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Ambient background glow */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${glowColorMap[mood]} blur-md transition-all duration-300 pointer-events-none`}
      />

      {/* Robot Head Frame */}
      <motion.div
        className={`relative ${sizeMap[size]} rounded-2xl bg-gradient-to-b from-[#1E2230] to-[#12151F] border border-white/15 shadow-md flex items-center justify-center overflow-hidden p-1`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Cute Ear Antennas */}
        <div className="absolute -top-1 left-1.5 w-2 h-2 rounded-full bg-indigo-400/80 blur-[1px]" />
        <div className="absolute -top-1 right-1.5 w-2 h-2 rounded-full bg-purple-400/80 blur-[1px]" />

        {/* Visor Screen */}
        <div className="relative w-full h-[75%] bg-[#0B0D14] rounded-xl border border-white/10 flex items-center justify-center gap-1.5 px-2 overflow-hidden shadow-inner">
          {/* Subtle scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

          {/* Left Eye */}
          <motion.div
            className="rounded-full transition-all duration-200"
            style={{ backgroundColor: eyeColor, boxShadow: `0 0 8px ${eyeColor}` }}
            animate={
              mood === "thinking"
                ? { scaleY: [1, 0.2, 1], scaleX: [1, 1.2, 1] }
                : mood === "alert"
                ? { scale: [1, 1.15, 1], rotate: [-4, 4, 0] }
                : mood === "approved"
                ? { scaleY: 0.9, scaleX: 1.1 }
                : { scaleY: [1, 1, 0.1, 1] }
            }
            transition={{
              repeat: Infinity,
              duration: mood === "thinking" ? 1.2 : mood === "alert" ? 0.8 : 4,
              times: mood === "idle" ? [0, 0.9, 0.95, 1] : undefined,
            }}
            initial={false}
          >
            <div className={size === "sm" ? "w-1.5 h-2" : size === "md" ? "w-2.5 h-3" : size === "lg" ? "w-3.5 h-4.5" : "w-5 h-6"} />
          </motion.div>

          {/* Right Eye */}
          <motion.div
            className="rounded-full transition-all duration-200"
            style={{ backgroundColor: eyeColor, boxShadow: `0 0 8px ${eyeColor}` }}
            animate={
              mood === "thinking"
                ? { scaleY: [1, 0.2, 1], scaleX: [1, 1.2, 1] }
                : mood === "alert"
                ? { scale: [1, 1.15, 1], rotate: [4, -4, 0] }
                : mood === "approved"
                ? { scaleY: 0.9, scaleX: 1.1 }
                : { scaleY: [1, 1, 0.1, 1] }
            }
            transition={{
              repeat: Infinity,
              duration: mood === "thinking" ? 1.2 : mood === "alert" ? 0.8 : 4,
              times: mood === "idle" ? [0, 0.9, 0.95, 1] : undefined,
            }}
            initial={false}
          >
            <div className={size === "sm" ? "w-1.5 h-2" : size === "md" ? "w-2.5 h-3" : size === "lg" ? "w-3.5 h-4.5" : "w-5 h-6"} />
          </motion.div>
        </div>

        {/* Status indicator dot */}
        {showBadge && (
          <span className="absolute bottom-0.5 right-0.5 flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: eyeColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: eyeColor }}
            />
          </span>
        )}
      </motion.div>
    </div>
  );
}
