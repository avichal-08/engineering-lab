"use client";

import React, { useState } from "react";
import { Play, Pause, RotateCcw, AlertTriangle, ArrowRight, Gauge, Activity } from "lucide-react";

interface PipelineStage {
  step: number;
  label: string;
  rps: number;
  queueDepth: number;
  p99LatencyMs: number;
  status: "NORMAL" | "CONGESTION" | "TIMEOUTS" | "CASCADE_FAILURE";
  summary: string;
}

const stages: PipelineStage[] = [
  {
    step: 1,
    label: "Normal Operating Window",
    rps: 450,
    queueDepth: 4,
    p99LatencyMs: 12,
    status: "NORMAL",
    summary: "Incoming traffic matches provisioned worker pool capacity. Zero queue buildup.",
  },
  {
    step: 2,
    label: "Client Traffic Surges",
    rps: 3200,
    queueDepth: 180,
    p99LatencyMs: 145,
    status: "CONGESTION",
    summary: "Sudden flash-crowd burst exceeds thread capacity. In-memory socket buffer fills.",
  },
  {
    step: 3,
    label: "Queue Saturation & Buffer Bloat",
    rps: 5400,
    queueDepth: 850,
    p99LatencyMs: 620,
    status: "TIMEOUTS",
    summary: "Buffer depth exceeds service SLAs. Clients begin timing out while requests wait in queue.",
  },
  {
    step: 4,
    label: "Cascading Thread & Memory Exhaustion",
    rps: 7800,
    queueDepth: 1200,
    p99LatencyMs: 3400,
    status: "CASCADE_FAILURE",
    summary: "Out-of-memory errors, connection pool exhaustion, and complete server collapse.",
  },
];

export function RequestFlowDiagram() {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const active = stages[currentStep];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-6 font-sans">
      {/* Top Headline & Pipeline Step Controller */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block">
            Failure Cascade Progression
          </span>
          <h4 className="text-sm font-bold text-zinc-100">{active.label}</h4>
        </div>

        {/* Step Selector Pills */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {stages.map((st, i) => (
            <button
              key={st.step}
              onClick={() => setCurrentStep(i)}
              className={`px-3 py-1 rounded-md transition text-xs font-mono ${
                currentStep === i
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Step 0{st.step}
            </button>
          ))}
          <button
            onClick={() => setCurrentStep(0)}
            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 ml-1"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Node 1 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">1. Inbound Requests</div>
          <div className="font-mono font-bold text-sm text-zinc-100">{active.rps.toLocaleString()} req/s</div>
          <div className={`text-[11px] font-mono ${currentStep > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {currentStep === 0 ? "Within limits" : "Traffic Spike"}
          </div>
        </div>

        {/* Node 2 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">2. Worker Queue</div>
          <div className="font-mono font-bold text-sm text-zinc-100">{active.queueDepth} queued</div>
          <div className={`text-[11px] font-mono ${currentStep >= 2 ? "text-rose-400 font-bold" : "text-zinc-400"}`}>
            {currentStep >= 2 ? "Queue Saturation" : "Processing buffer"}
          </div>
        </div>

        {/* Node 3 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">3. p99 Tail Latency</div>
          <div className="font-mono font-bold text-sm text-zinc-100">{active.p99LatencyMs} ms</div>
          <div className={`text-[11px] font-mono ${active.p99LatencyMs > 500 ? "text-rose-400" : "text-emerald-400"}`}>
            {active.p99LatencyMs > 500 ? "SLA Breached" : "Optimal (SLO < 50ms)"}
          </div>
        </div>

        {/* Node 4 */}
        <div className={`rounded-xl border p-3.5 space-y-1 transition-all ${
          active.status === "CASCADE_FAILURE"
            ? "border-rose-500/50 bg-rose-950/20 text-rose-300"
            : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
        }`}>
          <div className="text-[10px] font-mono text-zinc-500 uppercase">4. Service State</div>
          <div className="font-mono font-bold text-sm">
            {active.status === "NORMAL" && "Healthy"}
            {active.status === "CONGESTION" && "Degraded"}
            {active.status === "TIMEOUTS" && "Partial Drop"}
            {active.status === "CASCADE_FAILURE" && "Outage"}
          </div>
          <div className="text-[11px] font-mono opacity-80">
            {active.status === "CASCADE_FAILURE" ? "Downstream crash" : "Thread pool intact"}
          </div>
        </div>
      </div>

      {/* Narrative Explanation */}
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-300 leading-relaxed max-w-2xl">{active.summary}</span>
        {currentStep < stages.length - 1 && (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            className="shrink-0 flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition pl-4 font-bold"
          >
            <span>Next Phase</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
