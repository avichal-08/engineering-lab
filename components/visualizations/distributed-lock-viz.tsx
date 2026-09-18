"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, Pause, Play, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";

export function DistributedLockViz() {
  const [lockOwner, setLockOwner] = useState<"Worker A" | "Worker B" | null>(null);
  const [fencingToken, setFencingToken] = useState<number>(40);
  const [ttl, setTtl] = useState<number>(0);
  const [workerAFrozen, setWorkerAFrozen] = useState<boolean>(false);
  const [storageVersion, setStorageVersion] = useState<number>(40);
  const [log, setLog] = useState<string>("Lock is free. Ready for acquisition.");

  // TTL countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (ttl > 0 && lockOwner) {
      timer = setInterval(() => {
        setTtl((t) => {
          if (t <= 1) {
            setLockOwner(null);
            setLog(`Lease TTL expired! Lock automatically released due to inactivity/crash.`);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [ttl, lockOwner]);

  const acquireLockA = () => {
    if (lockOwner) {
      setLog(`Worker A failed to acquire: already held by ${lockOwner}.`);
      return;
    }
    const nextToken = fencingToken + 1;
    setFencingToken(nextToken);
    setLockOwner("Worker A");
    setTtl(8);
    setLog(`Worker A acquired lock! Dispensed monotonic fencing token: ${nextToken} with 8s lease.`);
  };

  const acquireLockB = () => {
    if (lockOwner) {
      setLog(`Worker B failed to acquire: already held by ${lockOwner}.`);
      return;
    }
    const nextToken = fencingToken + 1;
    setFencingToken(nextToken);
    setLockOwner("Worker B");
    setTtl(8);
    setLog(`Worker B acquired lock! Dispensed monotonic fencing token: ${nextToken} with 8s lease.`);
  };

  const simulateGCPauseA = () => {
    setWorkerAFrozen(true);
    setLog("Worker A entered 15s Stop-The-World GC Pause! Worker A is frozen while its Redis lease ticks down.");
  };

  const unpauseA = () => {
    setWorkerAFrozen(false);
    setLog("Worker A woke up from GC pause! It still believes it owns the lock.");
  };

  const writeFromA = () => {
    if (workerAFrozen) return;
    const token = 41; // A's initial token
    if (token < storageVersion) {
      setLog(`[WRITE REJECTED]: Worker A sent token=${token}, but storage already observed token=${storageVersion}. Prevented silent data corruption!`);
    } else {
      setStorageVersion(token);
      setLog(`[WRITE COMMITTED]: Storage accepted write from Worker A with fencing token=${token}.`);
    }
  };

  const writeFromB = () => {
    const token = 42; // B's token
    if (token < storageVersion) {
      setLog(`[WRITE REJECTED]: Worker B token=${token} is stale.`);
    } else {
      setStorageVersion(token);
      setLog(`[WRITE COMMITTED]: Storage accepted write from Worker B with fencing token=${token}.`);
    }
  };

  const releaseLock = () => {
    setLockOwner(null);
    setTtl(0);
    setLog("Lock explicitly released via atomic Lua script.");
  };

  const resetAll = () => {
    setLockOwner(null);
    setFencingToken(40);
    setTtl(0);
    setWorkerAFrozen(false);
    setStorageVersion(40);
    setLog("Lock state reset.");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Distributed Lock & Monotonic Fencing Tokens
          </h3>
          <p className="text-xs text-zinc-400">
            Solving the Stop-The-World GC pause dilemma via incrementing tokens.
          </p>
        </div>

        <button
          onClick={resetAll}
          className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200 transition"
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
        {/* Worker A */}
        <div className={`rounded-xl border p-4 space-y-3 transition-all ${
          lockOwner === "Worker A" ? "border-emerald-500/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-200">Worker Process A</span>
            {lockOwner === "Worker A" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                HOLDS LOCK
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-zinc-400">
            Assigned Token: <strong className="text-zinc-200">41</strong>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={acquireLockA}
              disabled={!!lockOwner || workerAFrozen}
              className="w-full px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-mono text-zinc-200 transition"
            >
              Acquire Lock (SET NX PX)
            </button>
            <button
              onClick={workerAFrozen ? unpauseA : simulateGCPauseA}
              className={`w-full px-3 py-1.5 rounded text-xs font-mono border transition ${
                workerAFrozen
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300"
              }`}
            >
              {workerAFrozen ? "Resume from GC Pause" : "Simulate 15s GC Freeze"}
            </button>
            <button
              onClick={writeFromA}
              disabled={workerAFrozen}
              className="w-full px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono transition"
            >
              Write to Shared Storage
            </button>
          </div>
        </div>

        {/* Central Lock Coordinator (Redis) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-zinc-200">Redis Lock Coordinator</span>
              {lockOwner ? (
                <Lock className="h-4 w-4 text-emerald-400" />
              ) : (
                <Unlock className="h-4 w-4 text-zinc-500" />
              )}
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className={lockOwner ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                  {lockOwner ? `LOCKED by ${lockOwner}` : "UNLOCKED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Lease TTL:</span>
                <span className="text-amber-400 font-bold">{ttl}s remaining</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Fencing Counter:</span>
                <span className="text-cyan-400 font-bold">{fencingToken}</span>
              </div>
            </div>
          </div>

          {lockOwner && (
            <button
              onClick={releaseLock}
              className="mt-4 w-full px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition"
            >
              Explicit Release (Lua)
            </button>
          )}
        </div>

        {/* Worker B */}
        <div className={`rounded-xl border p-4 space-y-3 transition-all ${
          lockOwner === "Worker B" ? "border-cyan-500/50 bg-cyan-950/20" : "border-zinc-800 bg-zinc-900/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-200">Worker Process B</span>
            {lockOwner === "Worker B" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
                HOLDS LOCK
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-zinc-400">
            Assigned Token: <strong className="text-zinc-200">42</strong>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={acquireLockB}
              disabled={!!lockOwner}
              className="w-full px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-mono text-zinc-200 transition"
            >
              Acquire Lock (SET NX PX)
            </button>
            <button
              onClick={writeFromB}
              className="w-full px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition"
            >
              Write to Shared Storage
            </button>
          </div>
        </div>
      </div>

      {/* Target Storage with Fencing Check */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-1 font-mono text-xs">
        <div className="flex justify-between items-center text-[11px] border-b border-zinc-800 pb-1">
          <span className="text-zinc-400">SHARED STORAGE STATE: Highest Token Seen = {storageVersion}</span>
          <span className="text-zinc-500">INVARIANT: write.token &gt;= highest_token</span>
        </div>
        <div className="text-zinc-300 pt-1 leading-relaxed">
          LOG: <span className="text-emerald-300">{log}</span>
        </div>
      </div>
    </div>
  );
}
