"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, CheckCircle2, Zap, ArrowRight, Play, RotateCcw } from "lucide-react";

interface Packet {
  id: number;
  status: "pending" | "accepted" | "rejected";
  progress: number;
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
    }, 1200);
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
      progress: 0,
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
    }, 150);
  };

  const resetHero = () => {
    setPackets([]);
    setTokens(maxTokens);
    setAcceptedCount(0);
    setRejectedCount(0);
  };

  return (
    <div className="relative w-full rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 md:p-8 active-cyan-glow overflow-hidden">
      {/* Top Header info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Live Gateway Pipeline Telemetry
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>200 OK: {acceptedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>429 Rejected: {rejectedCount}</span>
          </div>
          <button
            onClick={triggerBurst}
            disabled={isBursting}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <Zap className="h-3 w-3" />
            <span>Simulate Burst</span>
          </button>
        </div>
      </div>

      {/* SVG Pipeline Canvas */}
      <div className="relative w-full overflow-x-auto py-4">
        <div className="min-w-[680px] grid grid-cols-4 gap-4 items-center relative">
          {/* Node 1: Client */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center relative z-10">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Traffic Source
            </div>
            <div className="font-mono font-bold text-sm text-zinc-100">Client Apps</div>
            <div className="mt-2 text-[10px] font-mono text-cyan-400/80">Bursty RPS</div>
          </div>

          {/* Node 2: API Gateway */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center relative z-10">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Reverse Proxy
            </div>
            <div className="font-mono font-bold text-sm text-zinc-100">API Gateway</div>
            <div className="mt-2 text-[10px] font-mono text-zinc-400">TLS Termination</div>
          </div>

          {/* Node 3: Rate Limiter Guard */}
          <div className="rounded-xl border border-cyan-500/40 bg-zinc-900/90 p-4 text-center relative z-10 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Token Bucket Guard
            </div>
            <div className="font-mono font-bold text-sm text-cyan-200">Rate Limiter</div>
            <div className="mt-2 text-[10px] font-mono text-zinc-300 flex items-center justify-center gap-1">
              <span>Tokens:</span>
              <span className="font-bold text-cyan-400">{tokens}/{maxTokens}</span>
            </div>
          </div>

          {/* Node 4: Backend Microservice */}
          <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-4 text-center relative z-10">
            <div className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider mb-1">
              Protected Target
            </div>
            <div className="font-mono font-bold text-sm text-emerald-200">Core Service</div>
            <div className="mt-2 text-[10px] font-mono text-zinc-400">Stable Latency</div>
          </div>

          {/* Connectors & Branching Lines */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-16 z-0">
            {/* Horizontal transit lines */}
            <div className="w-full h-0.5 bg-zinc-800/80 relative">
              {/* 429 Drop Branch at Rate Limiter */}
              <div className="absolute left-[62%] top-0 w-16 h-12 border-l border-b border-rose-500/50 rounded-bl-lg" />
              <div className="absolute left-[64%] top-12 font-mono text-[10px] text-rose-400 flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-rose-500/30">
                <ShieldAlert className="h-3 w-3" />
                HTTP 429 (Rejected)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Animated Packets */}
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-zinc-500 pt-3 border-t border-zinc-900">
        <span>Dynamic state evaluation: Inbound requests consume 1 token. Zero tokens trigger instantaneous 429 branch.</span>
        <button
          onClick={resetHero}
          className="text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
    </div>
  );
}
