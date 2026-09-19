"use client";

import React, { useState } from "react";
import { AlertCircle, Eye, Hammer, Flame, Server, ArrowRight } from "lucide-react";

interface Step {
  stepNum: string;
  stage: string;
  sublabel: string;
  icon: React.ElementType;
  sentence: string;
  tagColor: string;
  accentColor: string;
}

const steps: Step[] = [
  {
    stepNum: "01",
    stage: "Problem",
    sublabel: "DECONSTRUCT",
    icon: AlertCircle,
    sentence: "Witness how burst traffic, network partitions, and jitter trigger silent system failures.",
    tagColor: "text-rose-400 border-rose-500/30 bg-rose-950/20",
    accentColor: "group-hover:border-rose-500/40",
  },
  {
    stepNum: "02",
    stage: "Visualize",
    sublabel: "SANDBOX",
    icon: Eye,
    sentence: "Experiment directly with live token buckets, circuit transitions, and SVG hash rings.",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20",
    accentColor: "group-hover:border-cyan-500/40",
  },
  {
    stepNum: "03",
    stage: "Build",
    sublabel: "BLUEPRINT",
    icon: Hammer,
    sentence: "Trace data structures, synchronization primitives, and algorithmic models from first principles.",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
    accentColor: "group-hover:border-emerald-500/40",
  },
  {
    stepNum: "04",
    stage: "Break",
    sublabel: "STRESS TEST",
    icon: Flame,
    sentence: "Inject poison pills, simulated GC freezes, clock drift, and split-brain scenarios.",
    tagColor: "text-amber-400 border-amber-500/30 bg-amber-950/20",
    accentColor: "group-hover:border-amber-500/40",
  },
  {
    stepNum: "05",
    stage: "Production",
    sublabel: "SHIP",
    icon: Server,
    sentence: "Inspect idiomatic, production-grade reference implementations in Go, TypeScript, Python, and Java.",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-950/20",
    accentColor: "group-hover:border-purple-500/40",
  },
];

export function HorizontalJourney() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="w-full space-y-12 font-sans">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider">
          <span>The Invariants Loop</span>
        </div>
        <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
          How Engineers Actually Master Software Mechanics
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-[72ch] mx-auto leading-relaxed">
          Move from deconstructing failures to building resilient primitives with production-grade code.
        </p>
      </div>

      {/* Structural Flex Layout with Centered Connectors */}
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 lg:gap-3.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isHovered = hoveredIdx === idx;

          return (
            <React.Fragment key={step.stage}>
              {/* Individual Stage Card */}
              <div
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 lg:p-6 flex flex-col justify-between space-y-5 transition-all duration-200 group ${
                  step.accentColor
                } ${
                  isHovered
                    ? "bg-zinc-900/60 shadow-lg shadow-black/40 -translate-y-0.5"
                    : "hover:bg-zinc-900/40"
                }`}
              >
                {/* Card Top: Step number & sublabel */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-500 group-hover:text-zinc-200 transition-colors">
                    {step.stepNum}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {step.sublabel}
                  </span>
                </div>

                {/* Card Body */}
                <div className="space-y-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${step.tagColor}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <h3 className="font-mono font-bold text-base text-zinc-100 group-hover:text-cyan-300 transition-colors">
                    {step.stage}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-[72ch]">
                    {step.sentence}
                  </p>
                </div>

                {/* Card Bottom: Progress Accent Bar */}
                <div className="pt-2">
                  <div className="h-0.5 w-full bg-zinc-800/80 group-hover:bg-cyan-500/50 rounded-full transition-colors" />
                </div>
              </div>

              {/* Structural Connector (Perfect vertical middle) */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center text-zinc-700 px-0.5 shrink-0 select-none">
                  <ArrowRight
                    className={`h-4 w-4 transition-colors duration-200 ${
                      hoveredIdx === idx ? "text-cyan-400" : "text-zinc-700"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
