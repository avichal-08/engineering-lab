"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Terminal } from "lucide-react";
import { motion } from "motion/react";

interface ExperimentOption {
  id: string;
  name: string;
  slug: string;
  primitive: string;
  category: string;
}

const EXPERIMENTS: ExperimentOption[] = [
  {
    id: "rate-limiting",
    name: "Rate Limiting",
    slug: "rate-limiting",
    primitive: "Token Bucket Concurrency",
    category: "Resilience",
  },
  {
    id: "circuit-breaker",
    name: "Circuit Breaker",
    slug: "circuit-breaker",
    primitive: "Tri-State Finite State Machine",
    category: "Reliability",
  },
  {
    id: "consistent-hashing",
    name: "Consistent Hashing",
    slug: "consistent-hashing",
    primitive: "360° Circular Ring & VNodes",
    category: "Distributed",
  },
];

export function HeroExperimentControl() {
  const [selected, setSelected] = useState<string>("rate-limiting");

  const current = EXPERIMENTS.find((e) => e.id === selected) || EXPERIMENTS[0];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      const nextIndex = (index + 1) % EXPERIMENTS.length;
      setSelected(EXPERIMENTS[nextIndex].id);
    } else if (e.key === "ArrowLeft") {
      const prevIndex = (index - 1 + EXPERIMENTS.length) % EXPERIMENTS.length;
      setSelected(EXPERIMENTS[prevIndex].id);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 font-sans shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-200">
      {/* Subtle top console edge accent */}
      <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* Control Surface Header */}
      <div className="flex items-center justify-between px-1.5 pb-2 border-b border-zinc-800/60 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </span>
          <span className="uppercase tracking-widest text-zinc-400 font-semibold">
            Start An Experiment
          </span>
        </div>
        <span className="text-zinc-500 hidden sm:inline-block">
          Select Primitive
        </span>
      </div>

      {/* Segmented Switcher & Direct Run Action */}
      <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Lab Switcher Segmented Control */}
        <div
          role="radiogroup"
          aria-label="Select System Experiment"
          className="flex-1 grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80"
        >
          {EXPERIMENTS.map((exp, idx) => {
            const isSelected = selected === exp.id;
            return (
              <button
                key={exp.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onClick={() => setSelected(exp.id)}
                className={`relative flex items-center justify-center py-2 px-2 rounded-md font-mono text-xs transition-all duration-150 text-center select-none ${
                  isSelected
                    ? "text-cyan-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="hero-selected-experiment"
                    className="absolute inset-0 rounded-md bg-zinc-800 border border-cyan-500/40 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 truncate w-full">{exp.name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Trigger */}
        <Link
          href={`/learn/${current.slug}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 sm:py-2.5 font-mono text-xs font-semibold text-zinc-950 hover:bg-cyan-300 active:scale-[0.98] transition-all shadow-md shrink-0 group"
        >
          <Play className="h-3 w-3 fill-zinc-950 text-zinc-950" />
          <span>Run Experiment</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Target Preview Telemetry Bar */}
      <div className="mt-2.5 px-1.5 pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-900/90">
        <div className="flex items-center gap-2 truncate">
          <span className="text-zinc-600">TARGET:</span>
          <span className="text-cyan-400/90 truncate">/learn/{current.slug}</span>
          <span className="text-zinc-700 hidden sm:inline">&bull;</span>
          <span className="text-zinc-500 hidden sm:inline truncate">{current.primitive}</span>
        </div>
        <Link
          href="/learn"
          className="text-[10px] text-zinc-500 hover:text-cyan-400 transition ml-2 shrink-0 flex items-center gap-1"
        >
          <span>All 10 Labs</span>
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}
