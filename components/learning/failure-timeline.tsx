"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertOctagon, Flame, Database, ShieldAlert, Clock, Sparkles } from "lucide-react";

interface TimelineEvent {
  timeMs: string;
  title: string;
  symptom: string;
  status: "normal" | "warning" | "critical" | "disaster";
  connectionImpact: string;
}

const events: TimelineEvent[] = [
  {
    timeMs: "0 ms",
    title: "Flash Sale Begins",
    symptom: "Traffic spikes instantaneously from 800 req/s to 50,000 req/s.",
    status: "normal",
    connectionImpact: "DB Pool: 45 / 500 active connections",
  },
  {
    timeMs: "180 ms",
    title: "Queue Saturation",
    symptom: "Application threads lock waiting for Postgres connections. TCP accept backlog fills.",
    status: "warning",
    connectionImpact: "DB Pool: 500 / 500 (100% saturated)",
  },
  {
    timeMs: "350 ms",
    title: "Upstream Timeouts",
    symptom: "Clients hit their 300ms HTTP read timeout. Gateway drops waiting sockets.",
    status: "critical",
    connectionImpact: "Database is now executing queries for sockets that are already abandoned.",
  },
  {
    timeMs: "600 ms",
    title: "The Retry Storm",
    symptom: "50,000 failed clients simultaneously retry requests, doubling the load to 100k RPS.",
    status: "critical",
    connectionImpact: "CPU spikes to 100%. Thread context-switching consumes all CPU cycles.",
  },
  {
    timeMs: "900 ms",
    title: "Total Cascading Outage",
    symptom: "PostgreSQL crash under connection exhaustion. Entire cluster health checks fail.",
    status: "disaster",
    connectionImpact: "Global outage. Complete service restart required.",
  },
];

export function FailureTimeline() {
  const [deepDiveOpen, setDeepDiveOpen] = useState<boolean>(false);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  return (
    <div className="space-y-6 font-sans">
      {/* Context Scenario Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="font-mono text-[10px] text-rose-400 uppercase tracking-wider font-bold">
            Simulated Production Incident
          </span>
          <h4 className="text-sm font-bold text-zinc-100">
            Black Friday Flash Sale: 50,000 RPS vs 500 Max Database Connections
          </h4>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="rounded bg-rose-950/40 border border-rose-800/60 px-2 py-0.5 text-rose-300">
            50,000 req/s
          </span>
          <span className="text-zinc-500">vs</span>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
            500 DB Conns
          </span>
        </div>
      </div>

      {/* Visual Timeline Cards */}
      <div className="relative pl-6 space-y-4 border-l-2 border-zinc-800">
        {events.map((ev, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <div
              key={ev.timeMs}
              onClick={() => setSelectedIdx(idx)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative ${
                isSelected
                  ? "border-cyan-500/50 bg-zinc-900/90 active-cyan-glow"
                  : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700"
              }`}
            >
              {/* Timeline Pin Indicator */}
              <div
                className={`absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 ${
                  ev.status === "disaster"
                    ? "bg-rose-500 border-rose-300"
                    : ev.status === "critical"
                    ? "bg-amber-500 border-amber-300"
                    : ev.status === "warning"
                    ? "bg-yellow-500 border-yellow-300"
                    : "bg-emerald-500 border-emerald-300"
                }`}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    +{ev.timeMs}
                  </span>
                  <h5 className="text-sm font-bold text-zinc-200">{ev.title}</h5>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {ev.connectionImpact}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed max-w-[72ch]">
                {ev.symptom}
              </p>
            </div>
          );
        })}
      </div>

      {/* Expandable Mathematical Deep Dive */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <button
          onClick={() => setDeepDiveOpen(!deepDiveOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 transition"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <strong className="text-zinc-200">Deep Dive: Little's Law & Concurrency Physics</strong>
          </span>
          {deepDiveOpen ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {deepDiveOpen && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-300 space-y-3 font-mono leading-relaxed">
            <p>
              According to <strong>Little&apos;s Law</strong> (<code className="text-cyan-300">L = λ × W</code>):
            </p>
            <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
              <div>L = Average concurrent requests in flight</div>
              <div>λ = Arrival rate (50,000 req/sec)</div>
              <div>W = Mean processing duration (0.050 sec = 50ms)</div>
              <div className="mt-2 text-emerald-400 font-bold">
                L = 50,000 × 0.050 = 2,500 simultaneous threads required
              </div>
            </div>
            <p className="text-zinc-400">
              When your maximum database connection pool is 500, having 2,500 concurrent callers forces 2,000 requests into queue latency. Queued requests quickly exceed client timeouts, generating 2,000 retries per 50ms interval.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
