"use client";

import React, { useState } from "react";
import { AlertOctagon, ChevronDown, ChevronUp, ShieldCheck, Wrench, Flame } from "lucide-react";

export interface IncidentData {
  id: string;
  problem: string;
  symptom: string;
  whyItHappened: string;
  engineeringFix: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

interface IncidentCardProps {
  incident: IncidentData;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden font-sans transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/40 transition gap-4"
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              incident.severity === "CRITICAL"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : incident.severity === "HIGH"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            }`}
          >
            {incident.severity}
          </span>
          <h4 className="font-mono text-xs sm:text-sm font-bold text-zinc-100">{incident.problem}</h4>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 shrink-0">
          <span className="text-[11px] font-mono hidden sm:inline">
            {isOpen ? "Collapse" : "Investigate"}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/20 space-y-3 font-mono text-xs">
          {/* Symptom */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
            <span className="text-zinc-500 uppercase text-[10px] font-bold block">Incident Symptom</span>
            <p className="text-zinc-200 leading-relaxed max-w-[72ch]">{incident.symptom}</p>
          </div>

          {/* Root Cause (Why it happened) */}
          <div className="rounded-lg border border-rose-950/60 bg-rose-950/10 p-3 space-y-1">
            <span className="text-rose-400 uppercase text-[10px] font-bold flex items-center gap-1">
              <Flame className="h-3 w-3" /> Root Cause Analysis
            </span>
            <p className="text-zinc-300 leading-relaxed max-w-[72ch]">{incident.whyItHappened}</p>
          </div>

          {/* Engineering Fix */}
          <div className="rounded-lg border border-emerald-950/60 bg-emerald-950/10 p-3 space-y-1">
            <span className="text-emerald-400 uppercase text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Production Engineering Fix
            </span>
            <p className="text-emerald-200 leading-relaxed max-w-[72ch]">{incident.engineeringFix}</p>
          </div>
        </div>
      )}
    </div>
  );
}
