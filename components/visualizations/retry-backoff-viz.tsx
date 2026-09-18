"use client";

import React, { useState } from "react";
import { Play, RotateCcw, Shuffle, Sparkles } from "lucide-react";

interface AttemptSample {
  attempt: number;
  deterministicMs: number;
  fullJitterMs: number;
  equalJitterMs: number;
}

export function RetryBackoffViz() {
  const baseDelayMs = 100;
  const maxDelayMs = 3200;
  const maxAttempts = 6;

  const [samples, setSamples] = useState<AttemptSample[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<"full" | "equal" | "none">("full");

  const runSimulation = () => {
    const newSamples: AttemptSample[] = [];
    for (let i = 0; i < maxAttempts; i++) {
      const cap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, i));
      const deterministicMs = cap;
      const fullJitterMs = Math.round(Math.random() * cap);
      const half = cap / 2;
      const equalJitterMs = Math.round(half + Math.random() * half);

      newSamples.push({
        attempt: i,
        deterministicMs,
        fullJitterMs,
        equalJitterMs,
      });
    }
    setSamples(newSamples);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Exponential Backoff & Jitter Desynchronization
          </h3>
          <p className="text-xs text-zinc-400">
            Formula: <code className="font-mono text-cyan-300">sleep = random(0, min(maxDelay, base * 2^attempt))</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runSimulation}
            className="flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Generate Jitter Sample
          </button>
        </div>
      </div>

      <div className="py-6 space-y-6">
        {/* Strategy Selector */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setSelectedStrategy("full")}
            className={`px-3 py-1.5 rounded-md border font-medium transition ${
              selectedStrategy === "full"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Full Jitter (AWS Recommended)
          </button>
          <button
            onClick={() => setSelectedStrategy("equal")}
            className={`px-3 py-1.5 rounded-md border font-medium transition ${
              selectedStrategy === "equal"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Equal Jitter (Half Cap + Rand)
          </button>
          <button
            onClick={() => setSelectedStrategy("none")}
            className={`px-3 py-1.5 rounded-md border font-medium transition ${
              selectedStrategy === "none"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            No Jitter (Deterministic - Storm Hazard)
          </button>
        </div>

        {/* Graph representation */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
          <div className="text-xs font-mono text-zinc-400 flex justify-between border-b border-zinc-800 pb-2">
            <span>RETRY ATTEMPT</span>
            <span>BACKOFF DELAY (ms)</span>
          </div>

          {[0, 1, 2, 3, 4, 5].map((attempt) => {
            const cap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
            const sample = samples[attempt];
            const currentVal = sample
              ? selectedStrategy === "full"
                ? sample.fullJitterMs
                : selectedStrategy === "equal"
                ? sample.equalJitterMs
                : sample.deterministicMs
              : cap;

            const percentage = (currentVal / maxDelayMs) * 100;

            return (
              <div key={attempt} className="flex items-center gap-4 text-xs font-mono">
                <span className="w-20 text-zinc-400">Attempt {attempt + 1}:</span>
                <div className="flex-1 h-5 bg-zinc-950 rounded overflow-hidden relative border border-zinc-800">
                  {/* Cap reference bar */}
                  <div
                    className="absolute top-0 bottom-0 border-r border-dashed border-zinc-600 z-10"
                    style={{ left: `${(cap / maxDelayMs) * 100}%` }}
                    title={`Max cap: ${cap}ms`}
                  />
                  {/* Active sleep bar */}
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedStrategy === "full"
                        ? "bg-cyan-500/60"
                        : selectedStrategy === "equal"
                        ? "bg-amber-500/60"
                        : "bg-rose-500/60"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-16 text-right font-bold text-zinc-200">{currentVal}ms</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200">Why Jitter Matters:</strong> Without jitter (red), 1,000 clients retrying
          simultaneously all fire their next request at exactly +100ms, +200ms, and +400ms in lock-step. Full Jitter
          (cyan) disperses them randomly across the timeline, completely smoothing out the ingress spike.
        </div>
      </div>
    </div>
  );
}
