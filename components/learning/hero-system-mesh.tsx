"use client";

import React from "react";
import { motion } from "motion/react";

export function HeroSystemMesh() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -top-12 pointer-events-none overflow-hidden select-none -z-10"
    >
      {/* Soft Ambient Radial Illumination */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[360px] bg-gradient-to-b from-cyan-500/8 via-teal-500/4 to-transparent blur-3xl rounded-full opacity-70" />

      {/* Technical Coordinate Field & Living System Rails */}
      <svg
        className="absolute inset-0 w-full h-full stroke-zinc-800/40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hero-tech-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
            />
            {/* Coordinate intersection tick */}
            <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.08)" />
          </pattern>
        </defs>

        {/* Base Grid Texture */}
        <rect width="100%" height="100%" fill="url(#hero-tech-grid)" />

        {/* Subtle Horizontal Telemetry Rail 1 */}
        <line
          x1="10%"
          y1="25%"
          x2="90%"
          y2="25%"
          stroke="rgba(6, 182, 212, 0.12)"
          strokeWidth="1"
          strokeDasharray="4 8"
        />

        {/* Subtle Horizontal Telemetry Rail 2 */}
        <line
          x1="15%"
          y1="68%"
          x2="85%"
          y2="68%"
          stroke="rgba(6, 182, 212, 0.08)"
          strokeWidth="1"
          strokeDasharray="6 12"
        />

        {/* System Anchor Nodes with subtle pulse */}
        <circle cx="25%" cy="25%" r="3" fill="rgba(6, 182, 212, 0.4)" />
        <circle cx="75%" cy="25%" r="3" fill="rgba(6, 182, 212, 0.4)" />
        <circle cx="50%" cy="68%" r="3" fill="rgba(6, 182, 212, 0.3)" />

        {/* Subtle Ping around anchor node (hidden on reduced motion) */}
        <circle
          cx="25%"
          cy="25%"
          r="8"
          fill="none"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
          className="motion-reduce:hidden animate-ping"
          style={{ animationDuration: "4s" }}
        />
      </svg>

      {/* Living Signal Lines Traversing Rails (motion-safe) */}
      <div className="absolute inset-0 motion-reduce:hidden">
        {/* Signal Packet A */}
        <motion.div
          initial={{ left: "15%", top: "25%", opacity: 0 }}
          animate={{
            left: ["15%", "85%"],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1],
          }}
          className="absolute h-1 w-8 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(6,182,212,0.8)]"
        />

        {/* Signal Packet B (Reverse Rail) */}
        <motion.div
          initial={{ right: "20%", top: "68%", opacity: 0 }}
          animate={{
            right: ["20%", "80%"],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            delay: 3,
            ease: "easeInOut",
            times: [0, 0.15, 0.85, 1],
          }}
          className="absolute h-1 w-10 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_6px_rgba(20,184,166,0.6)]"
        />
      </div>

      {/* Top Edge Vignette */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}
