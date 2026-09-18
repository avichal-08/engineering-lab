"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Cpu, ShieldAlert, GitFork } from "lucide-react";

interface ExperimentOption {
  id: string;
  name: string;
  slug: string;
  primitive: string;
}

const EXPERIMENTS: ExperimentOption[] = [
  {
    id: "rate-limiting",
    name: "Rate Limiting",
    slug: "rate-limiting",
    primitive: "Token Bucket Concurrency",
  },
  {
    id: "circuit-breaker",
    name: "Circuit Breaker",
    slug: "circuit-breaker",
    primitive: "Tri-State Finite State Machine",
  },
  {
    id: "consistent-hashing",
    name: "Consistent Hashing",
    slug: "consistent-hashing",
    primitive: "360° Circular Ring & VNodes",
  },
];

export function HeroExperimentControl() {
  const [selected, setSelected] = useState<string>("rate-limiting");

  const current = EXPERIMENTS.find((e) => e.id === selected) || EXPERIMENTS[0];

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-2.5 sm:p-3 font-sans shadow-xl backdrop-blur-sm">
      {/* Control Surface Header */}
      <div className="flex items-center justify-between px-1.5 pb-2 border-b border-zinc-800/60 text-[10px] font-mono">
        <span className="uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          Start An Experiment
        </span>
        <span className="text-zinc-500 hidden sm:inline-block">
          Select Primitive
        </span>
      </div>

      {/* Experiment Selector Segmented Strip & Run Action */}
      <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Lab Switcher Buttons */}
        <div
          role="radiogroup"
          aria-label="Select System Experiment"
          className="flex-1 grid grid-cols-3 gap-1.5 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60"
        >
          {EXPERIMENTS.map((exp) => {
            const isSelected = selected === exp.id;
            return (
              <button
                key={exp.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(exp.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md font-mono text-xs transition-all duration-150 text-center ${
                  isSelected
                    ? "bg-zinc-800 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                }`}
              >
                <span className="truncate w-full">{exp.name}</span>
              </button>
            );
          })}
        </div>

        {/* Direct Run Action */}
        <Link
          href={`/learn/${current.slug}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 sm:py-2.5 font-mono text-xs font-semibold text-zinc-950 hover:bg-cyan-300 active:scale-95 transition-all shadow-md shrink-0 group"
        >
          <Play className="h-3 w-3 fill-zinc-950 text-zinc-950" />
          <span>Run Experiment</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Target Preview Telemetry Strip */}
      <div className="mt-2 px-1.5 pt-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-900">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-zinc-600">TARGET:</span>
          <span className="text-zinc-400 truncate">/{current.slug}</span>
        </div>
        <Link
          href="/learn"
          className="text-[10px] text-zinc-500 hover:text-cyan-400 transition ml-2 shrink-0"
        >
          All 10 Labs →
        </Link>
      </div>
    </div>
  );
}
