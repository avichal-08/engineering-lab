"use client";

import React, { useState } from "react";
import { Check, AlertCircle, ArrowRight } from "lucide-react";

interface TradeoffRowData {
  id: string;
  name: string;
  bestUseCase: string;
  memoryUsage: string;
  burstHandling: string;
  precision: string;
  distributedFriendliness: string;
  recommendedVerdict: string;
}

const tradeoffRows: TradeoffRowData[] = [
  {
    id: "token-bucket",
    name: "Token Bucket",
    bestUseCase: "General-purpose REST/GraphQL public APIs and user operations (AWS, Stripe).",
    memoryUsage: "~16 bytes per tenant key (2 integers: tokens count + timestamp).",
    burstHandling: "High — Gracefully accommodates bursts up to bucket capacity.",
    precision: "High — Continuous monotonic time resolution without window quantization.",
    distributedFriendliness: "Excellent — Trivial to implement in atomic Redis Lua script.",
    recommendedVerdict: "Default choice for 90% of microservice rate limiting applications.",
  },
  {
    id: "leaky-bucket",
    name: "Leaky Bucket",
    bestUseCase: "Downstream traffic shaping with rigid disk I/O, e.g. outbound webhook dispatchers.",
    memoryUsage: "~64 bytes per queue entry or ~24 bytes for virtual leaky bucket.",
    burstHandling: "Zero — Rejects or delays all bursts to guarantee a constant egress rate.",
    precision: "Strict — Completely flattens jitter and traffic peaks.",
    distributedFriendliness: "Moderate — Distributed queueing requires centralized lock coordination.",
    recommendedVerdict: "Ideal when downstream third-party targets crash from sudden concurrent bursts.",
  },
  {
    id: "fixed-window",
    name: "Fixed Window",
    bestUseCase: "Low-overhead internal throttling where precision is secondary to throughput.",
    memoryUsage: "~8 bytes per tenant key (single Redis string integer).",
    burstHandling: "Flawed — Vulnerable to 2x boundary spikes (100% burst at window edge).",
    precision: "Coarse — Quantized to window boundaries (e.g. 1 minute).",
    distributedFriendliness: "High — Direct Redis INCR with EXPIRE.",
    recommendedVerdict: "Use only for non-critical internal service throttling where simplicity is key.",
  },
  {
    id: "sliding-window",
    name: "Sliding Window",
    bestUseCase: "Strict financial transactions or security logins requiring exact rate accuracy.",
    memoryUsage: "~32 bytes (weighted approximation) to O(N) (timestamp sorted set).",
    burstHandling: "Moderate — Smooth transition with zero edge-burst vulnerability.",
    precision: "Very High — Sub-millisecond sliding window accounting.",
    distributedFriendliness: "High (weighted) / Low (sorted set ZADD overhead).",
    recommendedVerdict: "Use weighted variant when 2x boundary spikes are unacceptable for security endpoints.",
  },
];

export function TradeoffExplorer() {
  const [selectedId, setSelectedId] = useState<string>("token-bucket");

  const active = tradeoffRows.find((r) => r.id === selectedId) || tradeoffRows[0];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-6 font-sans">
      {/* Table of selectable rows */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="p-3">Primitive</th>
              <th className="p-3">Memory Footprint</th>
              <th className="p-3">Burst Tolerance</th>
              <th className="p-3">Distributed Readiness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {tradeoffRows.map((row) => {
              const isSelected = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? "bg-zinc-800/80 text-white font-medium"
                      : "hover:bg-zinc-900/40 text-zinc-300"
                  }`}
                >
                  <td className="p-3 font-bold flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"
                      }`}
                    />
                    <span>{row.name}</span>
                  </td>
                  <td className="p-3 text-cyan-300">{row.memoryUsage.split(" ")[0]}</td>
                  <td className="p-3 text-zinc-300">{row.burstHandling.split("—")[0]}</td>
                  <td className="p-3 text-emerald-400">{row.distributedFriendliness.split("—")[0]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Primitive Detailed Evaluation Card */}
      <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/40 p-5 space-y-3 active-cyan-glow">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-cyan-400">{active.name}</span>
            <span className="text-zinc-500 font-mono text-xs">•</span>
            <span className="font-mono text-[11px] text-zinc-300">{active.recommendedVerdict}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-1">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Best Real-World Use Case</span>
            <p className="text-zinc-200 leading-relaxed max-w-[72ch]">{active.bestUseCase}</p>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Precision & Boundaries</span>
            <p className="text-zinc-200 leading-relaxed max-w-[72ch]">{active.precision}</p>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Burst Handling</span>
            <p className="text-zinc-200 leading-relaxed max-w-[72ch]">{active.burstHandling}</p>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Distributed Coordination</span>
            <p className="text-zinc-200 leading-relaxed max-w-[72ch]">{active.distributedFriendliness}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
