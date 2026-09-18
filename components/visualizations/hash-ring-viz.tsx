"use client";

import React, { useState } from "react";
import { Plus, Minus, RotateCcw, Layers, Hash, Server, ArrowRight } from "lucide-react";

interface NodePosition {
  id: string;
  angle: number; // 0 to 360
  color: string;
}

interface KeyPosition {
  id: string;
  name: string;
  angle: number;
}

export function HashRingViz() {
  const initialNodes: NodePosition[] = [
    { id: "Node A", angle: 45, color: "#10b981" }, // emerald
    { id: "Node B", angle: 165, color: "#06b6d4" }, // cyan
    { id: "Node C", angle: 285, color: "#8b5cf6" }, // violet
  ];

  const keys: KeyPosition[] = [
    { id: "k1", name: "user:101", angle: 20 },
    { id: "k2", name: "user:102", angle: 70 },
    { id: "k3", name: "user:103", angle: 125 },
    { id: "k4", name: "user:104", angle: 195 },
    { id: "k5", name: "user:105", angle: 240 },
    { id: "k6", name: "user:106", angle: 310 },
    { id: "k7", name: "user:107", angle: 350 },
  ];

  const [nodes, setNodes] = useState<NodePosition[]>(initialNodes);
  const [nodeDAdded, setNodeDAdded] = useState<boolean>(false);
  const [vnodesEnabled, setVnodesEnabled] = useState<boolean>(false);
  const [lastMovedKeys, setLastMovedKeys] = useState<{ key: string; from: string; to: string }[]>([]);

  // Find owner node for a key (first node clockwise >= key angle)
  const getOwnerNode = (keyAngle: number, currentNodes: NodePosition[]): NodePosition => {
    const sorted = [...currentNodes].sort((a, b) => a.angle - b.angle);
    const nextNode = sorted.find((n) => n.angle >= keyAngle);
    return nextNode || sorted[0]; // wrap around to first node
  };

  const toggleNodeD = () => {
    if (!nodeDAdded) {
      // Add Node D at angle 225 degrees (between B and C)
      const newNodeD: NodePosition = { id: "Node D", angle: 225, color: "#f59e0b" };
      const newNodes = [...nodes, newNodeD];

      const moved: { key: string; from: string; to: string }[] = [];
      keys.forEach((k) => {
        const oldOwner = getOwnerNode(k.angle, nodes);
        const newOwner = getOwnerNode(k.angle, newNodes);
        if (oldOwner.id !== newOwner.id) {
          moved.push({ key: k.name, from: oldOwner.id, to: newOwner.id });
        }
      });

      setNodes(newNodes);
      setNodeDAdded(true);
      setLastMovedKeys(moved);
    } else {
      // Remove Node D
      const filtered = nodes.filter((n) => n.id !== "Node D");
      const moved: { key: string; from: string; to: string }[] = [];
      keys.forEach((k) => {
        const oldOwner = getOwnerNode(k.angle, nodes);
        const newOwner = getOwnerNode(k.angle, filtered);
        if (oldOwner.id !== newOwner.id) {
          moved.push({ key: k.name, from: oldOwner.id, to: newOwner.id });
        }
      });

      setNodes(filtered);
      setNodeDAdded(false);
      setLastMovedKeys(moved);
    }
  };

  const resetAll = () => {
    setNodes(initialNodes);
    setNodeDAdded(false);
    setVnodesEnabled(false);
    setLastMovedKeys([]);
  };

  // Group keys by current owner
  const keyOwnership: Record<string, string[]> = {};
  nodes.forEach((n) => {
    keyOwnership[n.id] = [];
  });
  keys.forEach((k) => {
    const owner = getOwnerNode(k.angle, nodes);
    if (keyOwnership[owner.id]) {
      keyOwnership[owner.id].push(k.name);
    }
  });

  const radius = 105;
  const cx = 135;
  const cy = 135;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="font-mono text-sm font-bold tracking-wide text-zinc-100 uppercase flex items-center gap-2">
            <Hash className="h-4 w-4 text-cyan-400" />
            <span>Consistent Hash Ring & Rebalance Simulator</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Clockwise token routing. Adding a node moves only keys in its immediate counter-clockwise sector.
          </p>
        </div>

        {/* Primary Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleNodeD}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium border transition active:scale-95 ${
              nodeDAdded
                ? "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
            }`}
          >
            {nodeDAdded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{nodeDAdded ? "Remove Node D (Scale In)" : "Add Node D (Scale Out)"}</span>
          </button>

          <button
            onClick={() => setVnodesEnabled(!vnodesEnabled)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium border transition ${
              vnodesEnabled
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Toggle Virtual Nodes"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{vnodesEnabled ? "VNodes: ON (3/node)" : "VNodes: OFF"}</span>
          </button>

          <button
            onClick={resetAll}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 hover:text-zinc-200 transition"
            title="Reset hash ring"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Ring Canvas & Cluster Key Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Circular Coordinate Ring */}
        <div className="md:col-span-6 flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
          <svg width="270" height="270" viewBox="0 0 270 270" className="overflow-visible">
            {/* Base Hash Ring Circle */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth="4"
              strokeDasharray="4 4"
            />

            {/* Virtual nodes indicator rings if enabled */}
            {vnodesEnabled &&
              nodes.map((n) => {
                const angle1 = (n.angle + 120) % 360;
                const angle2 = (n.angle + 240) % 360;
                const rad1 = ((angle1 - 90) * Math.PI) / 180;
                const rad2 = ((angle2 - 90) * Math.PI) / 180;
                return (
                  <React.Fragment key={`${n.id}-vnodes`}>
                    <circle
                      cx={cx + radius * Math.cos(rad1)}
                      cy={cy + radius * Math.sin(rad1)}
                      r="4"
                      fill={n.color}
                      opacity="0.4"
                    />
                    <circle
                      cx={cx + radius * Math.cos(rad2)}
                      cy={cy + radius * Math.sin(rad2)}
                      r="4"
                      fill={n.color}
                      opacity="0.4"
                    />
                  </React.Fragment>
                );
              })}

            {/* Physical Node Markers on Ring */}
            {nodes.map((n) => {
              const rad = ((n.angle - 90) * Math.PI) / 180;
              const x = cx + radius * Math.cos(rad);
              const y = cy + radius * Math.sin(rad);
              return (
                <g key={n.id}>
                  <circle cx={x} cy={y} r="13" fill="#09090b" stroke={n.color} strokeWidth="2.5" />
                  <circle cx={x} cy={y} r="4" fill={n.color} />
                  <text
                    x={x}
                    y={y + (rad > 0 && rad < Math.PI ? 24 : -18)}
                    fill={n.color}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {n.id} ({n.angle}°)
                  </text>
                </g>
              );
            })}

            {/* Inbound Key Markers */}
            {keys.map((k) => {
              const rad = ((k.angle - 90) * Math.PI) / 180;
              const owner = getOwnerNode(k.angle, nodes);
              const x = cx + radius * Math.cos(rad);
              const y = cy + radius * Math.sin(rad);
              return (
                <g key={k.id}>
                  <circle cx={x} cy={y} r="3.5" fill={owner.color} stroke="#09090b" strokeWidth="1" />
                  <line
                    x1={x}
                    y1={y}
                    x2={cx + (radius - 12) * Math.cos(rad)}
                    y2={cy + (radius - 12) * Math.sin(rad)}
                    stroke={owner.color}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                </g>
              );
            })}
          </svg>

          <div className="font-mono text-[10px] text-zinc-500 mt-2 text-center">
            360° SHA-1 / Murmur3 Hash Space • Clockwise Key Traversal
          </div>
        </div>

        {/* Right Distribution & Migration Ledger */}
        <div className="md:col-span-6 space-y-4">
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-1">
              <span>ACTIVE STORAGE NODES ({nodes.length})</span>
              <span>KEY ALLOCATION</span>
            </div>

            <div className="space-y-2">
              {nodes.map((n) => {
                const assigned = keyOwnership[n.id] || [];
                return (
                  <div
                    key={n.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: n.color }} />
                      <span className="font-bold text-zinc-200">{n.id}</span>
                      <span className="text-[10px] text-zinc-500">({n.angle}°)</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-400">{assigned.length} keys</span>
                      <span className="text-[10px] text-zinc-500">[{assigned.join(", ") || "empty"}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Migration Event Report */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase font-bold">
              <span>Topology Change Telemetry</span>
              <span className={lastMovedKeys.length > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                {lastMovedKeys.length} / {keys.length} Keys Migrated ({Math.round((lastMovedKeys.length / keys.length) * 100)}%)
              </span>
            </div>

            {lastMovedKeys.length === 0 ? (
              <p className="text-[11px] text-zinc-500">
                Topology stable. Add or remove Node D to inspect minimal key movement.
              </p>
            ) : (
              <div className="space-y-1 pt-1">
                {lastMovedKeys.map((m, i) => (
                  <div key={i} className="text-[11px] text-amber-300 flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>
                      {m.key}: reassigned from <strong className="text-zinc-200">{m.from}</strong> &rarr; <strong className="text-cyan-300">{m.to}</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
