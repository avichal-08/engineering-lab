"use client";

import React from "react";
import { AlertCircle, Eye, Hammer, Flame, Server, ArrowRight } from "lucide-react";

interface Step {
  stepNum: string;
  stage: string;
  sublabel: string;
  icon: React.ElementType;
  sentence: string;
  tagColor: string;
}

const steps: Step[] = [
  {
    stepNum: "01",
    stage: "Problem",
    sublabel: "DECONSTRUCT",
    icon: AlertCircle,
    sentence: "Witness how burst traffic and network jitter silently trigger cascading outages.",
    tagColor: "text-rose-400 border-rose-500/30 bg-rose-950/20",
  },
  {
    stepNum: "02",
    stage: "Visualize",
    sublabel: "SANDBOX",
    icon: Eye,
    sentence: "Interact directly with live token buckets, circuit states, and SVG hash rings.",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20",
  },
  {
    stepNum: "03",
    stage: "Build",
    sublabel: "BLUEPRINT",
    icon: Hammer,
    sentence: "Step through architectural blueprints, algorithms, and mutex locks from first principles.",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
  },
  {
    stepNum: "04",
    stage: "Break",
    sublabel: "STRESS TEST",
    icon: Flame,
    sentence: "Inject poison pills, simulated GC freezes, and network partition split-brains.",
    tagColor: "text-amber-400 border-amber-500/30 bg-amber-950/20",
  },
  {
    stepNum: "05",
    stage: "Production",
    sublabel: "SHIP",
    icon: Server,
    sentence: "Implement production reference code in Go, TypeScript, Python, and Java.",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-950/20",
  },
];

export function HorizontalJourney() {
  return (
    <div className="w-full space-y-12 font-sans">
      {/* Section Header with generous breathing room */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-semibold">
          The Engineering Lab Loop
        </span>
        <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
          How Engineers Actually Master Systems
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-[72ch] mx-auto leading-relaxed">
          Move from deconstructing failures to building resilient primitives with production code.
        </p>
      </div>

      {/* Structural Flex/Grid Layout with perfectly centered connectors */}
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 lg:gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.stage}>
              {/* Individual Step Card */}
              <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 lg:p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-200 group">
                {/* Card Top: Number & Tag */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {step.stepNum}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
                    {step.sublabel}
                  </span>
                </div>

                {/* Card Middle: Icon & Title */}
                <div className="space-y-2.5">
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

                {/* Card Bottom Progress Accent */}
                <div className="h-0.5 w-full bg-zinc-800/80 group-hover:bg-cyan-500/40 rounded-full transition-colors" />
              </div>

              {/* Structural Connector Arrow between cards */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center text-zinc-600 px-1 shrink-0">
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
