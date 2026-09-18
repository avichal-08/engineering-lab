"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";

interface RequestLog {
  id: number;
  time: string;
  status: "ALLOWED" | "REJECTED";
  tokensLeft: number;
}

export function RateLimiterViz() {
  const capacity = 10;
  const refillRatePerSec = 2; // 2 tokens per second

  const [tokens, setTokens] = useState<number>(10);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [allowedCount, setAllowedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [isBursting, setIsBursting] = useState<boolean>(false);

  const lastRefillRef = useRef<number>(Date.now());

  // Background token refill simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - lastRefillRef.current) / 1000;
      lastRefillRef.current = now;

      setTokens((prev) => Math.min(capacity, prev + elapsedSec * refillRatePerSec));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const sendRequest = () => {
    const now = Date.now();
    const elapsedSec = (now - lastRefillRef.current) / 1000;
    lastRefillRef.current = now;

    let currentTokens = Math.min(capacity, tokens + elapsedSec * refillRatePerSec);

    if (currentTokens >= 1) {
      currentTokens -= 1;
      setTokens(currentTokens);
      setAllowedCount((c) => c + 1);
      addLog("ALLOWED", currentTokens);
    } else {
      setTokens(currentTokens);
      setRejectedCount((c) => c + 1);
      addLog("REJECTED", currentTokens);
    }
  };

  const sendBurst = async () => {
    setIsBursting(true);
    for (let i = 0; i < 8; i++) {
      sendRequest();
      await new Promise((r) => setTimeout(r, 80));
    }
    setIsBursting(false);
  };

  const resetSimulation = () => {
    setTokens(capacity);
    setAllowedCount(0);
    setRejectedCount(0);
    setLogs([]);
    lastRefillRef.current = Date.now();
  };

  const addLog = (status: "ALLOWED" | "REJECTED", tokensLeft: number) => {
    const newLog: RequestLog = {
      id: Date.now() + Math.random(),
      time: new Date().toISOString().substring(17, 23),
      status,
      tokensLeft: Math.max(0, Math.floor(tokensLeft)),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 7)]);
  };

  const percentage = (tokens / capacity) * 100;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Interactive Token Bucket Simulator
          </h3>
          <p className="text-xs text-zinc-400">
            Capacity: <span className="font-mono text-zinc-200">{capacity} tokens</span> | Refill Rate:{" "}
            <span className="font-mono text-emerald-400">+{refillRatePerSec} tokens/sec</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={sendRequest}
            disabled={isBursting}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <Play className="h-3.5 w-3.5" />
            Send 1 Request
          </button>
          <button
            onClick={sendBurst}
            disabled={isBursting}
            className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 active:scale-95 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            Traffic Burst (8 reqs)
          </button>
          <button
            onClick={resetSimulation}
            className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 items-center">
        {/* Visual Bucket */}
        <div className="flex flex-col items-center">
          <div className="relative h-44 w-32 rounded-b-2xl border-2 border-t-0 border-zinc-700 bg-zinc-900/40 p-1 overflow-hidden shadow-inner flex flex-col justify-end">
            {/* Tokens liquid representation */}
            <div
              className="w-full rounded-b-xl bg-gradient-to-t from-emerald-600/60 to-emerald-400/40 transition-all duration-150 relative border-t border-emerald-400/50"
              style={{ height: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:10px_10px]" />
            </div>

            {/* Capacity tick marks */}
            <div className="absolute top-2 right-2 text-[10px] font-mono text-zinc-500">MAX: {capacity}</div>
            <div className="absolute bottom-2 inset-x-0 text-center font-mono text-xs font-bold text-zinc-200">
              {tokens.toFixed(1)} / {capacity}
            </div>
          </div>
          <span className="mt-2 text-xs font-medium text-zinc-400">Token Bucket State</span>
        </div>

        {/* Metrics Counters */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-200">200 OK Admitted</span>
            </div>
            <span className="font-mono text-base font-bold text-emerald-400">{allowedCount}</span>
          </div>

          <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-medium text-rose-200">429 Rate Limited</span>
            </div>
            <span className="font-mono text-base font-bold text-rose-400">{rejectedCount}</span>
          </div>

          <div className="text-[11px] text-zinc-400 leading-relaxed">
            Requests deduct 1 token. When bucket drops below 1.0, ingress returns{" "}
            <code className="text-rose-300 font-mono">HTTP 429 Too Many Requests</code> with a{" "}
            <code className="text-zinc-300 font-mono">Retry-After</code> header.
          </div>
        </div>

        {/* Realtime Request Log */}
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 flex flex-col h-44">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-800 pb-1">
            Live Request Stream
          </div>
          <div className="flex-1 overflow-hidden space-y-1.5 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">Click 'Send 1 Request' or 'Burst' to test...</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-0.5 px-1.5 rounded bg-zinc-950/40 text-[11px]"
                >
                  <span className="text-zinc-500">{log.time}</span>
                  <span
                    className={`font-semibold ${
                      log.status === "ALLOWED" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {log.status === "ALLOWED" ? "200 OK" : "429 REJECT"}
                  </span>
                  <span className="text-zinc-400">{log.tokensLeft} rem</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
