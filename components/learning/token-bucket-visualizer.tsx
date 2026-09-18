"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Zap, RotateCcw, ShieldCheck, ShieldAlert, Activity, Gauge, Server } from "lucide-react";
import { LatencyGraph } from "./latency-graph";

interface VisualPacket {
  id: number;
  status: "accepted" | "rejected";
  timestamp: number;
}

export function TokenBucketVisualizer() {
  // Configurable sliders
  const [capacity, setCapacity] = useState<number>(10);
  const [refillRate, setRefillRate] = useState<number>(3); // tokens per second
  const [incomingRps, setIncomingRps] = useState<number>(4);
  const [burstSize, setBurstSize] = useState<number>(8);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x

  // State
  const [tokens, setTokens] = useState<number>(10);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [allowedTotal, setAllowedTotal] = useState<number>(0);
  const [rejectedTotal, setRejectedTotal] = useState<number>(0);
  const [currentRpsActual, setCurrentRpsActual] = useState<number>(0);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([6, 8, 7, 7, 8, 6, 7]);
  const [recentPackets, setRecentPackets] = useState<VisualPacket[]>([]);

  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  // Refill loop
  useEffect(() => {
    const intervalMs = Math.max(50, 1000 / (refillRate * simSpeed));
    const timer = setInterval(() => {
      setTokens((prev) => Math.min(capacity, prev + 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refillRate, capacity, simSpeed]);

  // Continuous traffic generator
  useEffect(() => {
    if (!isContinuous) return;
    const intervalMs = Math.max(50, 1000 / (incomingRps * simSpeed));
    const timer = setInterval(() => {
      sendSingleRequest();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isContinuous, incomingRps, simSpeed, capacity]);

  // RPS Counter loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const lastSec = recentPackets.filter((p) => now - p.timestamp < 1000).length;
      setCurrentRpsActual(lastSec);
    }, 500);
    return () => clearInterval(timer);
  }, [recentPackets]);

  const sendSingleRequest = () => {
    const willAllow = tokensRef.current >= 1;
    const now = Date.now();

    if (willAllow) {
      setTokens((t) => Math.max(0, t - 1));
      setAllowedTotal((a) => a + 1);
      // healthy latency 5ms-12ms
      const l = 5 + Math.random() * 6;
      setLatencyHistory((prev) => [...prev.slice(-20), l]);
    } else {
      setRejectedTotal((r) => r + 1);
      // rejected latency spikes to illustrate queuing delay
      const l = 85 + Math.random() * 30;
      setLatencyHistory((prev) => [...prev.slice(-20), l]);
    }

    const packet: VisualPacket = {
      id: now + Math.random(),
      status: willAllow ? "accepted" : "rejected",
      timestamp: now,
    };

    setRecentPackets((prev) => [...prev.slice(-14), packet]);
  };

  const triggerBurst = () => {
    let sent = 0;
    const burstTimer = setInterval(() => {
      sendSingleRequest();
      sent++;
      if (sent >= burstSize) {
        clearInterval(burstTimer);
      }
    }, 80 / simSpeed);
  };

  const resetSimulation = () => {
    setTokens(capacity);
    setIsContinuous(false);
    setAllowedTotal(0);
    setRejectedTotal(0);
    setCurrentRpsActual(0);
    setRecentPackets([]);
    setLatencyHistory([6, 7, 6, 8, 7]);
  };

  const totalRequests = allowedTotal + rejectedTotal;
  const rejectionRate = totalRequests > 0 ? ((rejectedTotal / totalRequests) * 100).toFixed(1) : "0.0";
  const fillPercentage = Math.round((tokens / capacity) * 100);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 space-y-6 font-sans active-cyan-glow">
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="font-mono text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <span>Interactive Token Bucket Laboratory</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time packet arrival, leak/refill concurrency, and 429 rejection dynamics.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sendSingleRequest}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:bg-zinc-800 active:scale-95 transition"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>Single Request</span>
          </button>

          <button
            onClick={triggerBurst}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-mono font-medium text-amber-300 hover:bg-amber-500/20 active:scale-95 transition"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Burst ({burstSize} req)</span>
          </button>

          <button
            onClick={() => setIsContinuous(!isContinuous)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition active:scale-95 ${
              isContinuous
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            {isContinuous ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isContinuous ? "Stop Stream" : "Stream Traffic"}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 hover:text-zinc-200 transition"
            title="Reset simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Centerpiece Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual Token Bucket Container */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-xs text-zinc-400">
              Bucket Fill: <strong className="text-zinc-100">{tokens} / {capacity} Tokens</strong>
            </span>
            <span className="font-mono text-xs text-cyan-400">
              Refill: +{refillRate} tokens/sec
            </span>
          </div>

          {/* Bucket Reservoir Graphic */}
          <div className="relative h-28 w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col justify-end p-2">
            {/* Liquid Token Fill Layer */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-950/80 via-cyan-900/40 to-cyan-500/30 transition-all duration-300 border-t border-cyan-500/40"
              style={{ height: `${fillPercentage}%` }}
            />

            {/* Individual Tokens Grid Graphic */}
            <div className="relative z-10 flex flex-wrap gap-1.5 items-end content-end h-full">
              {Array.from({ length: tokens }).map((_, i) => (
                <div
                  key={i}
                  className="h-3.5 w-3.5 rounded-full bg-cyan-400 border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  title="1 Token"
                />
              ))}
              {tokens === 0 && (
                <div className="w-full text-center font-mono text-xs text-rose-400 py-6 animate-pulse">
                  Bucket Empty! All incoming requests rejected (HTTP 429).
                </div>
              )}
            </div>
          </div>

          {/* Recent Inbound Packet Stream Visualization */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <span>LIVE INBOUND PACKET STREAM</span>
              <span>GREEN: 200 OK | RED: 429 REJECT</span>
            </div>
            <div className="h-8 rounded bg-zinc-950 border border-zinc-800/80 px-2 flex items-center gap-1.5 overflow-x-auto">
              {recentPackets.length === 0 ? (
                <span className="text-[11px] font-mono text-zinc-600">Send requests or stream traffic...</span>
              ) : (
                recentPackets.map((p) => (
                  <span
                    key={p.id}
                    className={`h-4 px-1.5 rounded text-[10px] font-mono font-bold flex items-center shrink-0 animate-in fade-in zoom-in-75 duration-150 ${
                      p.status === "accepted"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {p.status === "accepted" ? "200" : "429"}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Telemetry & Latency Graph */}
        <div className="lg:col-span-5 space-y-4">
          <LatencyGraph data={latencyHistory} maxLatency={100} />

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <span className="text-[10px] text-zinc-500 uppercase block">Allowed (200)</span>
              <span className="text-emerald-400 font-bold text-sm">{allowedTotal.toLocaleString()}</span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <span className="text-[10px] text-zinc-500 uppercase block">Rejected (429)</span>
              <span className="text-rose-400 font-bold text-sm">{rejectedTotal.toLocaleString()}</span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <span className="text-[10px] text-zinc-500 uppercase block">Current RPS</span>
              <span className="text-zinc-200 font-bold text-sm">{currentRpsActual} req/s</span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <span className="text-[10px] text-zinc-500 uppercase block">429 Rejection Rate</span>
              <span className={`font-bold text-sm ${Number(rejectionRate) > 0 ? "text-rose-400" : "text-zinc-400"}`}>
                {rejectionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sliders Configuration Footer */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-zinc-800/80 font-mono text-xs">
        {/* Capacity */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Capacity (B):</span>
            <span className="text-cyan-300 font-bold">{capacity}</span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            value={capacity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCapacity(val);
              setTokens((t) => Math.min(val, t));
            }}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded"
          />
        </div>

        {/* Refill Rate */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Refill Rate (r):</span>
            <span className="text-cyan-300 font-bold">{refillRate}/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            value={refillRate}
            onChange={(e) => setRefillRate(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded"
          />
        </div>

        {/* Inbound RPS */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Incoming RPS:</span>
            <span className="text-cyan-300 font-bold">{incomingRps}/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={incomingRps}
            onChange={(e) => setIncomingRps(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded"
          />
        </div>

        {/* Burst Size */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Burst Size:</span>
            <span className="text-cyan-300 font-bold">{burstSize} req</span>
          </div>
          <input
            type="range"
            min="3"
            max="25"
            value={burstSize}
            onChange={(e) => setBurstSize(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded"
          />
        </div>

        {/* Simulation Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Speed:</span>
            <span className="text-cyan-300 font-bold">{simSpeed}x</span>
          </div>
          <div className="flex gap-1 pt-0.5">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`flex-1 py-0.5 rounded text-[10px] ${
                  simSpeed === s ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
