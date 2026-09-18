"use client";

import React, { useState } from "react";
import { Database, ShieldCheck, AlertTriangle, Play, RefreshCw, RotateCcw } from "lucide-react";

interface NodeState {
  id: string;
  value: string;
  version: number;
  alive: boolean;
}

export function ReplicationQuorumViz() {
  const N = 3; // Total nodes
  const [W, setW] = useState<number>(2);
  const [R, setR] = useState<number>(2);

  const [nodes, setNodes] = useState<NodeState[]>([
    { id: "Node 1", value: "v1_balance_$100", version: 1, alive: true },
    { id: "Node 2", value: "v1_balance_$100", version: 1, alive: true },
    { id: "Node 3", value: "v1_balance_$100", version: 1, alive: true },
  ]);

  const [lastLog, setLastLog] = useState<string>("Cluster healthy. Initialized with W=2, R=2 (Strong Consistency).");
  const [readWinner, setReadWinner] = useState<{ value: string; version: number } | null>(null);

  const isStrongConsistency = W + R > N;

  const executeWrite = () => {
    // Write increments version
    const aliveNodes = nodes.filter((n) => n.alive);
    if (aliveNodes.length < W) {
      setLastLog(`[WRITE REJECTED]: Available alive nodes (${aliveNodes.length}) < Write Quorum W (${W}). Request failed.`);
      return;
    }

    const nextVer = Math.max(...nodes.map((n) => n.version)) + 1;
    const nextVal = `v${nextVer}_balance_$${100 + nextVer * 50}`;

    // Write to W nodes
    let acks = 0;
    const updated = nodes.map((node) => {
      if (node.alive && acks < W) {
        acks++;
        return { ...node, value: nextVal, version: nextVer };
      }
      return node;
    });

    setNodes(updated);
    setLastLog(`[WRITE COMMITTED]: Dispatched to cluster. Received ${W} ACKs (W=${W}). Wrote '${nextVal}'.`);
  };

  const executeRead = () => {
    const aliveNodes = nodes.filter((n) => n.alive);
    if (aliveNodes.length < R) {
      setLastLog(`[READ FAILED]: Available alive nodes (${aliveNodes.length}) < Read Quorum R (${R}).`);
      return;
    }

    // Read from R nodes
    const sampled = aliveNodes.slice(0, R);
    sampled.sort((a, b) => b.version - a.version);
    const winner = sampled[0];
    setReadWinner({ value: winner.value, version: winner.version });

    // Detect if any read node had stale data -> Read Repair!
    const staleFound = sampled.some((n) => n.version < winner.version);

    if (staleFound) {
      // Heal stale nodes
      setNodes((prev) =>
        prev.map((n) => {
          if (sampled.some((s) => s.id === n.id) && n.version < winner.version) {
            return { ...n, value: winner.value, version: winner.version };
          }
          return n;
        })
      );
      setLastLog(
        `[READ QUORUM SATISFIED]: Queried R=${R} nodes. Winner: '${winner.value}' (ver ${winner.version}). Stale node detected -> Read Repair triggered automatically!`
      );
    } else {
      setLastLog(
        `[READ QUORUM SATISFIED]: Queried R=${R} nodes. Returned highest version '${winner.value}' (ver ${winner.version}). All read nodes were consistent.`
      );
    }
  };

  const toggleNodeAlive = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, alive: !n.alive } : n))
    );
  };

  const resetAll = () => {
    setNodes([
      { id: "Node 1", value: "v1_balance_$100", version: 1, alive: true },
      { id: "Node 2", value: "v1_balance_$100", version: 1, alive: true },
      { id: "Node 3", value: "v1_balance_$100", version: 1, alive: true },
    ]);
    setReadWinner(null);
    setLastLog("Cluster reset.");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Quorum Equation & Read Repair Simulator
          </h3>
          <p className="text-xs text-zinc-400">
            Formula: <code className="font-mono text-zinc-200">W + R &gt; N</code> (W={W}, R={R}, N={N} ➔{" "}
            <span className={isStrongConsistency ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {W + R} {isStrongConsistency ? "> 3 (Strong)" : "<= 3 (Eventual)"}
            </span>
            )
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={executeWrite}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <Play className="h-3.5 w-3.5" />
            Write Quorum (W={W})
          </button>
          <button
            onClick={executeRead}
            className="flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Read Quorum (R={R})
          </button>
          <button
            onClick={resetAll}
            className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="py-6 space-y-6">
        {/* Controls for W and R */}
        <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Write Quorum (W):</span>
            {[1, 2, 3].map((val) => (
              <button
                key={val}
                onClick={() => setW(val)}
                className={`px-2.5 py-1 rounded border transition ${
                  W === val
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Read Quorum (R):</span>
            {[1, 2, 3].map((val) => (
              <button
                key={val}
                onClick={() => setR(val)}
                className={`px-2.5 py-1 rounded border transition ${
                  R === val
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {isStrongConsistency ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="h-4 w-4" /> Strong Consistency Guaranteed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <AlertTriangle className="h-4 w-4" /> Risk of Stale Reads (W + R &lt;= N)
              </span>
            )}
          </div>
        </div>

        {/* 3 Replicas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`rounded-xl border p-4 space-y-3 transition-all ${
                !node.alive
                  ? "border-rose-900/50 bg-rose-950/20 opacity-60"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">{node.id}</span>
                </div>
                <button
                  onClick={() => toggleNodeAlive(node.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    node.alive
                      ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {node.alive ? "Crash Node" : "Revive Node"}
                </button>
              </div>

              <div className="rounded bg-zinc-950 p-2.5 border border-zinc-800 font-mono text-xs space-y-1">
                <div className="text-[11px] text-zinc-500">Record Value:</div>
                <div className="text-zinc-200 font-bold truncate">{node.alive ? node.value : "<OFFLINE>"}</div>
                <div className="text-[10px] text-zinc-400">Version: {node.alive ? node.version : "-"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Log */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 font-mono text-xs space-y-1">
          <div className="text-zinc-500 text-[11px]">COORDINATOR TELEMETRY:</div>
          <div className="text-zinc-200 leading-relaxed">{lastLog}</div>
        </div>
      </div>
    </div>
  );
}
