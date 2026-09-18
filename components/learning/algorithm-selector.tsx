"use client";

import React, { useState } from "react";
import { Check, X, Shield, Activity, Layers, ArrowRight } from "lucide-react";

interface AlgorithmData {
  id: string;
  name: string;
  subtitle: string;
  explanation: string;
  burstSupport: boolean;
  memoryPerKey: string;
  timeComplexity: string;
  pros: string[];
  cons: string[];
  visualType: "token-bucket" | "leaky-bucket" | "fixed-window" | "sliding-window";
}

const algorithms: AlgorithmData[] = [
  {
    id: "token-bucket",
    name: "Token Bucket",
    subtitle: "Burst-friendly & memory-efficient",
    explanation:
      "Tokens refill into a bucket of capacity B at rate r. Each request consumes 1 token. When empty, requests are rejected. Allows short bursts up to capacity B.",
    burstSupport: true,
    memoryPerKey: "~16 bytes (tokens count + last timestamp)",
    timeComplexity: "O(1) time",
    pros: [
      "Naturally absorbs sudden traffic bursts up to capacity",
      "Extremely light memory footprint (2 numbers per key)",
      "Industry standard: used by AWS, Stripe, Cloudflare",
    ],
    cons: [
      "Can allow momentary spikes into downstream databases",
      "Requires careful capacity sizing to avoid downstream overload",
    ],
    visualType: "token-bucket",
  },
  {
    id: "leaky-bucket",
    name: "Leaky Bucket",
    subtitle: "Strict traffic shaping & smoothing",
    explanation:
      "Requests enter a FIFO queue and leak out at a strictly constant rate. If the queue overflows, new requests are dropped. Completely flattens traffic spikes.",
    burstSupport: false,
    memoryPerKey: "~64 bytes (queue references)",
    timeComplexity: "O(1) amortized",
    pros: [
      "Eliminates burstiness; downstream servers receive constant RPS",
      "Guarantees deterministic resource consumption",
      "Ideal for strict third-party API quotas",
    ],
    cons: [
      "Bursts are delayed or dropped even if backend is idle",
      "Increases p99 latency by queueing requests unnecessarily",
    ],
    visualType: "leaky-bucket",
  },
  {
    id: "fixed-window",
    name: "Fixed Window Counter",
    subtitle: "Trivial counter per minute",
    explanation:
      "Divides time into fixed buckets (e.g. 12:00-12:01). A single counter tracks requests. Resets to 0 at the minute boundary. Vulnerable to 2x boundary spikes.",
    burstSupport: false,
    memoryPerKey: "~8 bytes (single integer)",
    timeComplexity: "O(1) INCR",
    pros: [
      "Extremely simple to implement with atomic INCR",
      "Lowest memory overhead of any approach",
    ],
    cons: [
      "Boundary vulnerability: 2x allowed traffic at edges (e.g. 12:00:59 & 12:01:01)",
      "Creates periodic herd spikes at the start of every interval",
    ],
    visualType: "fixed-window",
  },
  {
    id: "sliding-window",
    name: "Sliding Window Log / Counter",
    subtitle: "Sub-second boundary precision",
    explanation:
      "Smooths boundaries by calculating weighted averages between the current window and previous window, or maintaining a sliding timestamp sorted set.",
    burstSupport: false,
    memoryPerKey: "~32 bytes (weighted) to O(N) (log)",
    timeComplexity: "O(1) weighted / O(log N) set",
    pros: [
      "Completely cures the 2x boundary burst defect",
      "Mathematically smooth rate tracking across continuous time",
    ],
    cons: [
      "Weighted variant has a minor 0.05% approximation margin",
      "Sorted set variant consumes prohibitive memory under high concurrency",
    ],
    visualType: "sliding-window",
  },
];

export function AlgorithmSelector() {
  const [selectedId, setSelectedId] = useState<string>("token-bucket");

  const current = algorithms.find((a) => a.id === selectedId) || algorithms[0];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-6 font-sans">
      {/* Segmented Selector Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-zinc-800/80 pb-4">
        {algorithms.map((algo) => (
          <button
            key={algo.id}
            onClick={() => setSelectedId(algo.id)}
            className={`px-3 py-2.5 rounded-xl text-left transition-all ${
              selectedId === algo.id
                ? "bg-zinc-800 text-white font-medium border border-cyan-500/50 shadow-sm active-cyan-glow"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
            }`}
          >
            <div className="font-mono text-xs font-bold text-zinc-200">{algo.name}</div>
            <div className="text-[10px] text-zinc-500 truncate mt-0.5">{algo.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Main Algorithm Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left: Summary & Invariants */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <h4 className="font-mono text-sm font-bold text-zinc-100">{current.name}</h4>
              <span className="font-mono text-[10px] rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-zinc-400">
                {current.timeComplexity}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-[72ch]">
              {current.explanation}
            </p>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-emerald-950 bg-emerald-950/10 p-3.5 space-y-1.5 font-mono text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <Check className="h-3.5 w-3.5" /> Strengths
              </span>
              <ul className="space-y-1 text-zinc-300 text-[11px]">
                {current.pros.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-rose-950 bg-rose-950/10 p-3.5 space-y-1.5 font-mono text-xs">
              <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                <X className="h-3.5 w-3.5" /> Trade-offs
              </span>
              <ul className="space-y-1 text-zinc-300 text-[11px]">
                {current.cons.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Technical Spec Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 font-mono text-xs">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-1">
            Algorithm Specification
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Burst Tolerance:</span>
              <span className={`font-bold ${current.burstSupport ? "text-emerald-400" : "text-amber-400"}`}>
                {current.burstSupport ? "YES (Up to Capacity)" : "NO (Strictly Clipped)"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Memory Per Key:</span>
              <span className="text-cyan-300 font-bold">{current.memoryPerKey}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Atomic Primitive:</span>
              <span className="text-zinc-300">Lua / Mutex / INCR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
