"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, ChevronRight, Shuffle, AlertCircle } from "lucide-react";

interface Point {
  id: number;
  x: number;
  y: number;
  cluster: number; // index of assigned centroid, or -1
}

interface Centroid {
  x: number;
  y: number;
  history: { x: number; y: number }[];
}

const CLUSTER_COLORS = [
  { stroke: "#06b6d4", fill: "#0891b2", bg: "rgba(6, 182, 212, 0.15)", name: "Cyan" },
  { stroke: "#f43f5e", fill: "#e11d48", bg: "rgba(244, 63, 94, 0.15)", name: "Rose" },
  { stroke: "#10b981", fill: "#059669", bg: "rgba(16, 185, 129, 0.15)", name: "Emerald" },
  { stroke: "#f59e0b", fill: "#d97706", bg: "rgba(245, 158, 11, 0.15)", name: "Amber" },
  { stroke: "#a855f7", fill: "#9333ea", bg: "rgba(168, 85, 247, 0.15)", name: "Purple" },
  { stroke: "#38bdf8", fill: "#0284c7", bg: "rgba(56, 189, 248, 0.15)", name: "Sky" },
];

export function KMeansViz() {
  const [k, setK] = useState<number>(3);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [phase, setPhase] = useState<"ASSIGN" | "UPDATE">("ASSIGN");
  const [iterations, setIterations] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isConverged, setIsConverged] = useState<boolean>(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const svgWidth = 520;
  const svgHeight = 340;
  const pad = 35;

  const toSvgX = (x: number) => pad + (x / 10) * (svgWidth - 2 * pad);
  const toSvgY = (y: number) => svgHeight - pad - (y / 10) * (svgHeight - 2 * pad);
  const fromSvgX = (sx: number) => Math.max(0.5, Math.min(9.5, ((sx - pad) / (svgWidth - 2 * pad)) * 10));
  const fromSvgY = (sy: number) => Math.max(0.5, Math.min(9.5, ((svgHeight - pad - sy) / (svgHeight - 2 * pad)) * 10));

  // Generate synthetic datasets
  const generateDataset = useCallback((type: "blobs" | "elongated" | "outliers" | "uneven", kNum: number) => {
    setIsRunning(false);
    setIsConverged(false);
    setIterations(0);
    setPhase("ASSIGN");

    const newPoints: Point[] = [];
    let id = 1;

    if (type === "blobs") {
      // 3 natural clusters
      const centers = [
        { cx: 2.5, cy: 7.5, count: 18 },
        { cx: 7.5, cy: 7.0, count: 18 },
        { cx: 5.0, cy: 2.5, count: 18 },
      ];
      centers.forEach((c) => {
        for (let i = 0; i < c.count; i++) {
          newPoints.push({
            id: id++,
            x: Math.max(0.5, Math.min(9.5, c.cx + (Math.random() - 0.5) * 2.2)),
            y: Math.max(0.5, Math.min(9.5, c.cy + (Math.random() - 0.5) * 2.2)),
            cluster: -1,
          });
        }
      });
    } else if (type === "outliers") {
      // 2 clusters + 2 distant outliers
      for (let i = 0; i < 20; i++) {
        newPoints.push({
          id: id++,
          x: 3.0 + (Math.random() - 0.5) * 2.0,
          y: 7.0 + (Math.random() - 0.5) * 2.0,
          cluster: -1,
        });
      }
      for (let i = 0; i < 20; i++) {
        newPoints.push({
          id: id++,
          x: 7.0 + (Math.random() - 0.5) * 2.0,
          y: 3.0 + (Math.random() - 0.5) * 2.0,
          cluster: -1,
        });
      }
      // Distant single outliers
      newPoints.push({ id: id++, x: 1.0, y: 1.0, cluster: -1 });
      newPoints.push({ id: id++, x: 9.5, y: 9.0, cluster: -1 });
    } else if (type === "uneven") {
      // 1 dense giant cluster (40 points) vs 1 sparse tiny cluster (6 points)
      for (let i = 0; i < 40; i++) {
        newPoints.push({
          id: id++,
          x: 4.0 + (Math.random() - 0.5) * 3.5,
          y: 6.5 + (Math.random() - 0.5) * 3.0,
          cluster: -1,
        });
      }
      for (let i = 0; i < 6; i++) {
        newPoints.push({
          id: id++,
          x: 8.5 + (Math.random() - 0.5) * 1.0,
          y: 2.0 + (Math.random() - 0.5) * 1.0,
          cluster: -1,
        });
      }
    } else {
      // elongated
      for (let i = 0; i < 30; i++) {
        const t = (i / 30) * 6 + 2;
        newPoints.push({ id: id++, x: t, y: t * 0.7 + (Math.random() - 0.5) * 1.2, cluster: -1 });
      }
      for (let i = 0; i < 20; i++) {
        newPoints.push({
          id: id++,
          x: 2.5 + (Math.random() - 0.5) * 2.0,
          y: 2.5 + (Math.random() - 0.5) * 1.5,
          cluster: -1,
        });
      }
    }

    setPoints(newPoints);

    // Initialize K centroids randomly within bounds
    initCentroids(kNum, newPoints, false);
  }, []);

  const initCentroids = (kNum: number, currentPoints: Point[], badInit = false) => {
    const newCentroids: Centroid[] = [];
    if (badInit) {
      // Trap: put all centroids clustered tightly in one corner
      for (let i = 0; i < kNum; i++) {
        newCentroids.push({
          x: 2.0 + i * 0.3,
          y: 7.5 + i * 0.2,
          history: [{ x: 2.0 + i * 0.3, y: 7.5 + i * 0.2 }],
        });
      }
    } else {
      // Random pick from points
      for (let i = 0; i < kNum; i++) {
        const randPt = currentPoints[Math.floor(Math.random() * currentPoints.length)] || {
          x: 2 + i * 2,
          y: 5,
        };
        newCentroids.push({
          x: randPt.x + (Math.random() - 0.5) * 0.5,
          y: randPt.y + (Math.random() - 0.5) * 0.5,
          history: [{ x: randPt.x, y: randPt.y }],
        });
      }
    }
    setCentroids(newCentroids);
    setPhase("ASSIGN");
    setIsConverged(false);
    setIterations(0);
  };

  // Initial load
  useEffect(() => {
    generateDataset("blobs", k);
  }, []);

  // Step 1: Assign points to closest centroid
  const assignPhase = useCallback(() => {
    if (centroids.length === 0 || points.length === 0) return;

    let reassignments = 0;
    const updatedPoints = points.map((p) => {
      let minDistSq = Infinity;
      let closestIdx = 0;

      centroids.forEach((c, idx) => {
        const distSq = Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2);
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestIdx = idx;
        }
      });

      if (p.cluster !== closestIdx) reassignments++;
      return { ...p, cluster: closestIdx };
    });

    setPoints(updatedPoints);
    setPhase("UPDATE");

    if (reassignments === 0 && iterations > 0) {
      setIsConverged(true);
      setIsRunning(false);
    }
  }, [centroids, points, iterations]);

  // Step 2: Update centroid locations to mean of assigned points
  const updatePhase = useCallback(() => {
    if (centroids.length === 0) return;

    let maxShift = 0;
    const updatedCentroids = centroids.map((c, idx) => {
      const assigned = points.filter((p) => p.cluster === idx);
      if (assigned.length === 0) return c; // keep unchanged if no points

      const meanX = assigned.reduce((sum, p) => sum + p.x, 0) / assigned.length;
      const meanY = assigned.reduce((sum, p) => sum + p.y, 0) / assigned.length;
      const shift = Math.hypot(meanX - c.x, meanY - c.y);
      if (shift > maxShift) maxShift = shift;

      return {
        x: Number(meanX.toFixed(3)),
        y: Number(meanY.toFixed(3)),
        history: [...c.history, { x: Number(meanX.toFixed(3)), y: Number(meanY.toFixed(3)) }],
      };
    });

    setCentroids(updatedCentroids);
    setPhase("ASSIGN");
    setIterations((it) => it + 1);

    if (maxShift < 0.01) {
      setIsConverged(true);
      setIsRunning(false);
    }
  }, [centroids, points]);

  // Combined single step
  const executeStep = useCallback(() => {
    if (phase === "ASSIGN") {
      assignPhase();
    } else {
      updatePhase();
    }
  }, [phase, assignPhase, updatePhase]);

  // Auto-run loop
  useEffect(() => {
    if (isRunning && !isConverged) {
      const timer = setTimeout(executeStep, 400);
      return () => clearTimeout(timer);
    }
  }, [isRunning, isConverged, executeStep]);

  // Inertia / Within-Cluster Sum of Squares (WCSS)
  const inertia = points.reduce((acc, p) => {
    if (p.cluster < 0 || p.cluster >= centroids.length) return acc;
    const c = centroids[p.cluster];
    return acc + (Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2));
  }, 0);

  // Dragging points
  const handlePointerDown = (id: number) => {
    setDraggedId(id);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedId === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const x = Number(fromSvgX(sx).toFixed(2));
    const y = Number(fromSvgY(sy).toFixed(2));

    setPoints((prev) => prev.map((p) => (p.id === draggedId ? { ...p, x, y } : p)));
  };

  const handlePointerUp = () => {
    setDraggedId(null);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              K-Means Clustering & Centroid Migration
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Two-phase EM loop: Assign points to nearest centroid, then move centroid to mean coordinate.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={isConverged}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isRunning
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
                : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
            }`}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isRunning ? "Pause" : "Run EM Loop"}</span>
          </button>

          <button
            onClick={executeStep}
            disabled={isRunning || isConverged}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition disabled:opacity-40"
          >
            <span>{phase === "ASSIGN" ? "1. Assign Points" : "2. Move Centroids"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => initCentroids(k, points, false)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Re-initialize Centroids"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => generateDataset("blobs", k)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset Dataset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
          <span className={`text-base font-bold ${isConverged ? "text-emerald-400" : "text-amber-400"}`}>
            {isConverged ? "CONVERGED ✓" : phase === "ASSIGN" ? "Phase 1: Assign" : "Phase 2: Move"}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Inertia (WCSS)</span>
          <span className="text-base font-bold text-cyan-300">{inertia.toFixed(1)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Centroids (K)</span>
          <span className="text-base font-bold text-zinc-100">{k}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Iterations</span>
          <span className="text-base font-bold text-zinc-300">{iterations}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Total Points</span>
          <span className="text-base font-bold text-zinc-400">{points.length} (Draggable)</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex justify-center items-center overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] select-none touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Coordinate grid */}
          <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#3f3f46" strokeWidth="1" />
          <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#3f3f46" strokeWidth="1" />

          {/* Centroid Migration Trails */}
          {centroids.map((c, cIdx) => {
            const col = CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length];
            return c.history.map((histPt, hIdx) => {
              if (hIdx === 0) return null;
              const prev = c.history[hIdx - 1];
              return (
                <line
                  key={`trail-${cIdx}-${hIdx}`}
                  x1={toSvgX(prev.x)}
                  y1={toSvgY(prev.y)}
                  x2={toSvgX(histPt.x)}
                  y2={toSvgY(histPt.y)}
                  stroke={col.stroke}
                  strokeWidth="2"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
              );
            });
          })}

          {/* Cluster Points */}
          {points.map((p) => {
            const col =
              p.cluster >= 0 && p.cluster < centroids.length
                ? CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length]
                : { fill: "#71717a", stroke: "#27272a" };

            const sx = toSvgX(p.x);
            const sy = toSvgY(p.y);

            return (
              <g
                key={p.id}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={() => handlePointerDown(p.id)}
              >
                <circle
                  cx={sx}
                  cy={sy}
                  r={draggedId === p.id ? "6.5" : "4.5"}
                  fill={col.fill}
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {/* Centroid Markers */}
          {centroids.map((c, cIdx) => {
            const col = CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length];
            const sx = toSvgX(c.x);
            const sy = toSvgY(c.y);

            return (
              <g key={`centroid-${cIdx}`}>
                {/* Outer pulsing ring */}
                <circle
                  cx={sx}
                  cy={sy}
                  r="14"
                  fill="none"
                  stroke={col.stroke}
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                {/* Bold Diamond / Cross marker */}
                <polygon
                  points={`${sx},${sy - 8} ${sx + 8},${sy} ${sx},${sy + 8} ${sx - 8},${sy}`}
                  fill={col.stroke}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={sx}
                  y={sy - 17}
                  fill={col.stroke}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  μ{cIdx + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-4 right-4 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 font-mono text-[10px] space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold">◆</span>
            <span className="text-zinc-300">Centroid μ (Mean)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-zinc-300">Cluster Point</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-cyan-400 border-b border-dashed border-cyan-400" />
            <span className="text-zinc-300">Centroid Migration Trail</span>
          </div>
        </div>
      </div>

      {/* Control Surface & Break Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80">
        {/* K Slider */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Clusters (K):</span>
            <span className="text-cyan-300 font-bold">{k}</span>
          </div>
          <input
            type="range"
            min="2"
            max="5"
            step="1"
            value={k}
            onChange={(e) => {
              const newK = parseInt(e.target.value, 10);
              setK(newK);
              initCentroids(newK, points, false);
            }}
            className="w-full accent-cyan-400"
          />
          <p className="text-[10px] text-zinc-500">
            K-means has no mechanism to determine optimal K. Setting K=2 splits 3 natural groups; K=5 over-segments.
          </p>
        </div>

        {/* Dataset Presets */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Dataset Topologies:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => generateDataset("blobs", k)}
              className="px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 transition text-[11px]"
            >
              Spherical Blobs
            </button>
            <button
              onClick={() => generateDataset("elongated", k)}
              className="px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 transition text-[11px]"
            >
              Non-Spherical
            </button>
            <button
              onClick={() => generateDataset("uneven", k)}
              className="px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 transition text-[11px]"
            >
              Unequal Density
            </button>
            <button
              onClick={() => generateDataset("outliers", k)}
              className="px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 transition text-[11px]"
            >
              Distant Outliers
            </button>
          </div>
        </div>

        {/* Break Scenario Injection */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Break Scenario:
          </span>
          <div className="space-y-1.5">
            <button
              onClick={() => initCentroids(k, points, true)}
              className="w-full px-2.5 py-1.5 rounded border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 transition text-left text-[11px]"
            >
              ⚠ Clustered Init (Local Minima Trap)
            </button>
            <button
              onClick={() => {
                setK(5);
                generateDataset("blobs", 5);
              }}
              className="w-full px-2.5 py-1.5 rounded border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition text-left text-[11px]"
            >
              ⚠ Wrong K (Over-segmentation: K=5 on 3)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
