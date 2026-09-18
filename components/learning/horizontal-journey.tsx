"use client";

import React from "react";
import { AlertCircle, Eye, Hammer, Flame, Server, ArrowRight } from "lucide-react";

interface Step {
  stage: string;
  icon: React.ElementType;
  sentence: string;
  tag: string;
  color: string;
}

const steps: Step[] = [
  {
    stage: "Problem",
    icon: AlertCircle,
    sentence: "Witness how burst traffic and network jitter silently trigger cascading outages.",
    tag: "01 Deconstruct",
    color: "text-rose-400 border-rose-500/30 bg-rose-950/10",
  },
  {
    stage: "Visualize",
    icon: Eye,
    sentence: "Interact directly with live token buckets, circuit states, and SVG hash rings.",
    tag: "02 Sandbox",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/10",
  },
  {
    stage: "Build",
    icon: Hammer,
    sentence: "Step through blueprints, algorithms, and mutex locks from first principles.",
    tag: "03 Blueprint",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/10",
  },
  {
    stage: "Break",
    icon: Flame,
    sentence: "Inject poison pills, simulated GC freezes, and network partition faults.",
    tag: "04 Stress Test",
    color: "text-amber-400 border-amber-500/30 bg-amber-950/10",
  },
  {
    stage: "Production",
    icon: Server,
    sentence: "Implement production reference code in Go, TypeScript, Python, and Java.",
    tag: "05 Ship",
    color: "text-purple-400 border-purple-500/30 bg-purple-950/10",
  },
];

export function HorizontalJourney() {
  return (
    <div className="w-full space-y-8 font-sans">
      <div className="text-center space-y-2">
        <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
          The Engineering Lab Loop
        </span>
        <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          How Engineers Actually Master Systems
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.stage}
              className="group relative rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 flex flex-col justify-between transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/40 hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">{step.tag}</span>
                </div>

                <div>
                  <h3 className="font-mono font-bold text-sm text-zinc-100">{step.stage}</h3>
                  <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed max-w-[72ch]">
                    {step.sentence}
                  </p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 text-zinc-600">
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
