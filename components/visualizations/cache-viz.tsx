"use client";

import React, { useState, useEffect } from "react";
import { Database, Zap, RefreshCw, Trash2, CheckCircle, ArrowRight } from "lucide-react";

export function CacheViz() {
  const [cachedValue, setCachedValue] = useState<string | null>("iPhone 16 Pro ($999)");
  const [dbValue, setDbValue] = useState<string>("iPhone 16 Pro ($999)");
  const [ttl, setTtl] = useState<number>(15);
  const [lastEvent, setLastEvent] = useState<string>("Cache warm. Key 'product:42' holds data with 15s TTL.");
  const [latencyMs, setLatencyMs] = useState<number>(0.8);
  const [hitType, setHitType] = useState<"HIT" | "MISS" | null>("HIT");

  // TTL countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTtl((prev) => {
        if (prev <= 1) {
          setCachedValue(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const readProduct = () => {
    if (cachedValue !== null) {
      // Cache HIT
      setHitType("HIT");
      setLatencyMs(0.6);
      setLastEvent("Cache HIT! Retrieved from Redis memory in 0.6ms. Primary DB was not touched.");
    } else {
      // Cache MISS
      setHitType("MISS");
      setLatencyMs(48.2);
      setCachedValue(dbValue);
      setTtl(15);
      setLastEvent("Cache MISS! Read from PostgreSQL disk in 48.2ms. Populated Redis with 15s TTL.");
    }
  };

  const updateProduct = () => {
    const newPrice = Math.floor(899 + Math.random() * 200);
    const updated = `iPhone 16 Pro ($${newPrice})`;
    setDbValue(updated);
    // Cache invalidation (eviction)
    setCachedValue(null);
    setTtl(0);
    setHitType(null);
    setLastEvent(`Mutation: Updated DB price to $${newPrice}. Invalidated (deleted) Redis key 'product:42'.`);
  };

  const expireCache = () => {
    setCachedValue(null);
    setTtl(0);
    setHitType(null);
    setLastEvent("Simulated TTL expiration. Key 'product:42' evicted from memory.");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Cache-Aside (Lazy Loading) & Invalidation Simulator
          </h3>
          <p className="text-xs text-zinc-400">
            Key: <code className="font-mono text-zinc-200">shop:product:42</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={readProduct}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            Read Product (GET)
          </button>
          <button
            onClick={updateProduct}
            className="flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update Price (DB Mutation)
          </button>
          <button
            onClick={expireCache}
            className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Force Expire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
        {/* In-Memory Cache (Redis) */}
        <div className={`rounded-xl border p-4 transition-all duration-300 ${cachedValue ? "border-emerald-500/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/30"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">Redis In-Memory Tier</span>
            </div>
            {cachedValue ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                WARM (TTL: {ttl}s)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                EMPTY (MISS)
              </span>
            )}
          </div>

          <div className="rounded bg-zinc-950 p-3 border border-zinc-800/80 font-mono text-xs">
            <div className="text-[11px] text-zinc-500 mb-1">KEY: shop:product:42</div>
            <div className="text-zinc-200 font-bold">{cachedValue ?? "<nil> (Key not in memory)"}</div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-400">Latency: ~0.5ms via RAM</div>
        </div>

        {/* Persistent Relational Database (PostgreSQL) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">PostgreSQL Primary Database</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
              PERSISTENT (Source of Truth)
            </span>
          </div>

          <div className="rounded bg-zinc-950 p-3 border border-zinc-800/80 font-mono text-xs">
            <div className="text-[11px] text-zinc-500 mb-1">TABLE: products WHERE id = 42</div>
            <div className="text-zinc-200 font-bold">{dbValue}</div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-400">Latency: ~45ms via NVMe SSD + B-Tree Query</div>
        </div>
      </div>

      {/* Latency & Telemetry Output */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-400 truncate max-w-lg">{lastEvent}</span>
        <div className="flex items-center gap-3 shrink-0">
          {hitType && (
            <span className={`px-2 py-0.5 rounded font-bold ${hitType === "HIT" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
              {hitType}
            </span>
          )}
          <span className="text-zinc-300 font-bold">{latencyMs} ms</span>
        </div>
      </div>
    </div>
  );
}
