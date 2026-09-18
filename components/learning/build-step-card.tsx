"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Code2, AlertTriangle, Lightbulb, Compass } from "lucide-react";

export interface BlueprintStep {
  stepNumber: number;
  title: string;
  whyThisMatters: string;
  architectureImpact: string;
  commonMistakes: string[];
  pseudocode: string;
  implementationHint: string;
}

interface BuildStepCardProps {
  step: BlueprintStep;
  defaultOpen?: boolean;
}

export function BuildStepCard({ step, defaultOpen = false }: BuildStepCardProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden font-sans transition-all">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/40 transition gap-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400">
            0{step.stepNumber}
          </span>
          <div>
            <h4 className="font-mono text-sm font-bold text-zinc-100">{step.title}</h4>
            <span className="text-xs text-zinc-500 line-clamp-1">{step.whyThisMatters}</span>
          </div>
        </div>

        <div className="shrink-0 text-zinc-500">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/20 space-y-4 text-xs font-sans">
          {/* Why It Matters & Architecture Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" /> Why This Matters
              </span>
              <p className="text-zinc-300 leading-relaxed max-w-[72ch]">
                {step.whyThisMatters}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Architecture Impact
              </span>
              <p className="text-zinc-300 leading-relaxed max-w-[72ch]">
                {step.architectureImpact}
              </p>
            </div>
          </div>

          {/* Pseudocode Block */}
          {step.pseudocode && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Blueprint Pseudocode:</span>
              </div>
              <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-cyan-200/90 overflow-x-auto whitespace-pre leading-relaxed">
                {step.pseudocode}
              </pre>
            </div>
          )}

          {/* Common Mistakes */}
          {step.commonMistakes && step.commonMistakes.length > 0 && (
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-3 font-mono text-[11px] space-y-1">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Common Implementation Pitfalls:
              </span>
              <ul className="space-y-0.5 text-zinc-300 list-disc list-inside">
                {step.commonMistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Implementation Hint */}
          {step.implementationHint && (
            <div className="font-mono text-[11px] text-zinc-400">
              <strong className="text-zinc-300">Implementation Hint: </strong>
              {step.implementationHint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
