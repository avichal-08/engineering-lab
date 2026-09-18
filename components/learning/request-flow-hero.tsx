"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Zap, ArrowRight, RotateCcw } from "lucide-react";

interface Packet {
  id: number;
  status: "accepted" | "rejected";
  timestamp: number;
}

export function RequestFlowHero() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [acceptedCount, setAcceptedCount] = useState<number>(142);
  const [rejectedCount, setRejectedCount] = useState<number>(18);
  const [isBursting, setIsBursting] = useState<boolean>(false);
  const [tokens, setTokens] = useState<number>(6);
  const maxTokens = 10;

  // Natural refill
  useEffect(() => {
    const refillInterval = setInterval(() => {
      setTokens((t) => Math.min(maxTokens, t + 1));
    }, 900);
    return () => clearInterval(refillInterval);
  }, []);

  // Background gentle traffic
  useEffect(() => {
    const interval = setInterval(() => {
      dispatchPacket();
    }, 1400);
    return () => clearInterval(interval);
  }, [tokens]);

  const dispatchPacket = () => {
    const id = Date.now() + Math.random();
    const willPass = tokens > 0;

    if (willPass) {
      setTokens((t) => Math.max(0, t - 1));
      setAcceptedCount((c) => c + 1);
    } else {
      setRejectedCount((c) => c + 1);
    }

    const newPacket: Packet = {
      id,
      status: willPass ? "accepted" : "rejected",
      timestamp: Date.now(),
    };

    setPackets((prev) => [...prev.slice(-12), newPacket]);
  };

  const triggerBurst = () => {
    setIsBursting(true);
    let count = 0;
    const burstInterval = setInterval(() => {
      dispatchPacket();
      count++;
      if (count >= 7) {
        clearInterval(burstInterval);
        setIsBursting(false);
      }
    }, 160);
  };

  const resetHero = () => {
    setPackets([]);
    setTokens(maxTokens);
    setAcceptedCount(0);
    setRejectedCount(0);
  };

  return (
    <div className="relative w-full rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 md:p-8 active-cyan-glow">
      {/* Top Telemetry Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 mb-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Live Gateway Pipeline Telemetry
          </span>
        </div>

        {/* Telemetry Metrics & Trigger */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-950/20 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>200 OK: {acceptedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-500/20 bg-rose-950/20 text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>429 Rejected: {rejectedCount}</span>
          </div>

          <button
            onClick={triggerBurst}
            disabled={isBursting}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-medium text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>Simulate Burst</span>
          </button>
        </div>
      </div>

      {/* Responsive Pipeline Architecture */}
      <div className="w-full py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Node 1: Client */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center relative z-10 space-y-1">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Traffic Source
            </div>
            <div className="font-mono font-bold text-sm text-zinc-100">Client Apps</div>
            <div className="text-[10px] font-mono text-cyan-400/90 pt-1">Unconstrained RPS</div>
          </div>

          {/* Node 2: API Gateway */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center relative z-10 space-y-1">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Reverse Proxy
            </div>
            <div className="font-mono font-bold text-sm text-zinc-100">API Gateway</div>
            <div className="text-[10px] font-mono text-zinc-400 pt-1">TLS Termination</div>
          </div>

          {/* Node 3: Rate Limiter Guard */}
          <div className="rounded-xl border border-cyan-500/40 bg-zinc-900/90 p-4 text-center relative z-10 space-y-1 shadow-[0_0_15px_rgba(6,182,212,0.12)]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Token Bucket Guard
            </div>
            <div className="font-mono font-bold text-sm text-cyan-200">Rate Limiter</div>
            <div className="text-[10px] font-mono text-zinc-300 flex items-center justify-center gap-1.5 pt-1">
              <span>Tokens:</span>
              <span className="font-bold text-cyan-400">{tokens}/{maxTokens}</span>
            </div>
          </div>

          {/* Node 4: Backend Microservice */}
          <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-4 text-center relative z-10 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400/90 uppercase tracking-wider">
              Protected Target
            </div>
            <div className="font-mono font-bold text-sm text-emerald-200">Core Service</div>
            <div className="text-[10px] font-mono text-zinc-400 pt-1">Protected Capacity</div>
          </div>
        </div>

        {/* 429 Drop Branch Explanatory Callout */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-2.5 font-mono text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="h-2.5 w-2.5" />
            </span>
            <span>429 Drop Branch: When tokens reach 0, perimeter drops requests with Retry-After.</span>
          </div>

          <button
            onClick={resetHero}
            className="text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1 text-[11px]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Telemetry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
