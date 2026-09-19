"use client";

import React, { useState, useMemo, useCallback } from "react";
import { RotateCcw, Sparkles, Filter, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface DataPoint {
  id: number;
  x: number;
  y: number;
  label: 0 | 1;
}

const INITIAL_POINTS: DataPoint[] = [
  // Class 0 (Cyan - clustered in top left)
  { id: 1, x: 2.0, y: 7.0, label: 0 },
  { id: 2, x: 2.5, y: 8.2, label: 0 },
  { id: 3, x: 3.2, y: 6.5, label: 0 },
  { id: 4, x: 3.8, y: 7.8, label: 0 },
  { id: 5, x: 1.8, y: 5.5, label: 0 },
  { id: 6, x: 4.2, y: 6.0, label: 0 },
  { id: 7, x: 2.8, y: 6.0, label: 0 },
  // Class 1 (Rose - clustered in bottom right)
  { id: 8, x: 6.5, y: 3.0, label: 1 },
  { id: 9, x: 7.2, y: 2.2, label: 1 },
  { id: 10, x: 8.0, y: 3.5, label: 1 },
  { id: 11, x: 6.0, y: 4.2, label: 1 },
  { id: 12, x: 7.8, y: 4.5, label: 1 },
  { id: 13, x: 8.5, y: 2.0, label: 1 },
  { id: 14, x: 6.8, y: 1.8, label: 1 },
];

export function ClassificationViz() {
  const [points, setPoints] = useState<DataPoint[]>(INITIAL_POINTS);
  const [activeClass, setActiveClass] = useState<0 | 1>(0);
  const [modelType, setModelType] = useState<"logistic" | "knn">("logistic");
  const [knnK, setKnnK] = useState<number>(3);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  // Canvas bounds
  const svgWidth = 520;
  const svgHeight = 340;
  const pad = 35;

  const toSvgX = (x: number) => pad + (x / 10) * (svgWidth - 2 * pad);
  const toSvgY = (y: number) => svgHeight - pad - (y / 10) * (svgHeight - 2 * pad);
  const fromSvgX = (sx: number) => Math.max(0.5, Math.min(9.5, ((sx - pad) / (svgWidth - 2 * pad)) * 10));
  const fromSvgY = (sy: number) => Math.max(0.5, Math.min(9.5, ((svgHeight - pad - sy) / (svgHeight - 2 * pad)) * 10));

  // Compute Simple Logistic Regression weights via closed-form gradient approximation
  const logisticWeights = useMemo(() => {
    // Standard normal equations / gradient steps for 2D logistic
    let w1 = 0.8;
    let w2 = -0.8;
    let b = 0.0;

    const lr = 0.2;
    for (let iter = 0; iter < 100; iter++) {
      let dw1 = 0;
      let dw2 = 0;
      let db = 0;
      for (const p of points) {
        const z = w1 * p.x + w2 * p.y + b;
        const pred = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
        const err = pred - p.label;
        dw1 += err * p.x;
        dw2 += err * p.y;
        db += err;
      }
      const n = points.length || 1;
      w1 -= (lr * dw1) / n;
      w2 -= (lr * dw2) / n;
      b -= (lr * db) / n;
    }
    return { w1, w2, b };
  }, [points]);

  // KNN Predictor
  const predictKNN = useCallback(
    (x: number, y: number, kVal: number): { pred: 0 | 1; prob: number } => {
      if (points.length === 0) return { pred: 0, prob: 0.5 };
      const distances = points.map((p) => ({
        label: p.label,
        distSq: Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2),
      }));
      distances.sort((a, b) => a.distSq - b.distSq);
      const topK = distances.slice(0, Math.min(kVal, distances.length));
      const ones = topK.filter((item) => item.label === 1).length;
      const prob = ones / topK.length;
      return { pred: prob >= 0.5 ? 1 : 0, prob };
    },
    [points]
  );

  // Model Predict Function
  const predictPoint = useCallback(
    (x: number, y: number): { pred: 0 | 1; prob: number } => {
      if (modelType === "logistic") {
        const { w1, w2, b } = logisticWeights;
        const z = w1 * x + w2 * y + b;
        const prob = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
        return { pred: prob >= 0.5 ? 1 : 0, prob };
      } else {
        return predictKNN(x, y, knnK);
      }
    },
    [modelType, logisticWeights, predictKNN, knnK]
  );

  // Live Confusion Matrix & Metrics
  const metrics = useMemo(() => {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const p of points) {
      const { pred } = predictPoint(p.x, p.y);
      if (pred === 1 && p.label === 1) tp++;
      else if (pred === 1 && p.label === 0) fp++;
      else if (pred === 0 && p.label === 0) tn++;
      else if (pred === 0 && p.label === 1) fn++;
    }

    const total = points.length || 1;
    const accuracy = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { tp, fp, tn, fn, accuracy, precision, recall, f1, total };
  }, [points, predictPoint]);

  // Click canvas to add point
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedId !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const x = Number(fromSvgX(sx).toFixed(2));
    const y = Number(fromSvgY(sy).toFixed(2));

    const newPt: DataPoint = {
      id: Date.now() + Math.random(),
      x,
      y,
      label: activeClass,
    };
    setPoints((prev) => [...prev, newPt]);
  };

  const handlePointerDown = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
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

  // Presets & Scenarios
  const loadScenario = (scenario: "clean" | "overlap" | "outlier" | "imbalanced") => {
    switch (scenario) {
      case "clean":
        setPoints(INITIAL_POINTS);
        break;
      case "overlap":
        setPoints([
          ...INITIAL_POINTS,
          { id: 101, x: 5.0, y: 5.0, label: 0 },
          { id: 102, x: 5.2, y: 5.2, label: 1 },
          { id: 103, x: 4.8, y: 4.8, label: 1 },
          { id: 104, x: 5.4, y: 4.6, label: 0 },
        ]);
        break;
      case "outlier":
        setPoints([
          ...INITIAL_POINTS,
          { id: 201, x: 1.5, y: 1.5, label: 1 }, // Outlier deep in Class 0 territory
        ]);
        break;
      case "imbalanced":
        // 14 points of Class 0 vs 1 point of Class 1
        const imbalancedList: DataPoint[] = [];
        for (let i = 0; i < 15; i++) {
          imbalancedList.push({
            id: 300 + i,
            x: 2 + (i % 5) * 1.2,
            y: 3 + Math.floor(i / 5) * 1.5,
            label: 0,
          });
        }
        imbalancedList.push({ id: 399, x: 8.5, y: 8.5, label: 1 });
        setPoints(imbalancedList);
        break;
    }
  };

  // Coarse grid for background decision regions
  const gridResolution = 24;
  const gridCells = useMemo(() => {
    const cells: { x: number; y: number; prob: number; pred: 0 | 1 }[] = [];
    const stepX = 10 / gridResolution;
    const stepY = 10 / gridResolution;
    for (let i = 0; i < gridResolution; i++) {
      for (let j = 0; j < gridResolution; j++) {
        const gx = i * stepX + stepX / 2;
        const gy = j * stepY + stepY / 2;
        const { prob, pred } = predictPoint(gx, gy);
        cells.push({ x: gx, y: gy, prob, pred });
      }
    }
    return cells;
  }, [gridResolution, predictPoint]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Classification & Decision Boundaries
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click to place points. Compare linear separation (Logistic) vs non-parametric boundary (KNN).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Active Placement Class */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <span className="text-[10px] text-zinc-500 px-2 uppercase">Add:</span>
            <button
              onClick={() => setActiveClass(0)}
              className={`px-2 py-1 rounded text-xs transition ${
                activeClass === 0
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ● Class 0 (Cyan)
            </button>
            <button
              onClick={() => setActiveClass(1)}
              className={`px-2 py-1 rounded text-xs transition ${
                activeClass === 1
                  ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ● Class 1 (Rose)
            </button>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <button
              onClick={() => setModelType("logistic")}
              className={`px-2.5 py-1 rounded text-xs transition ${
                modelType === "logistic"
                  ? "bg-zinc-800 text-white font-bold border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Logistic Regression
            </button>
            <button
              onClick={() => setModelType("knn")}
              className={`px-2.5 py-1 rounded text-xs transition ${
                modelType === "knn"
                  ? "bg-zinc-800 text-white font-bold border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              KNN (k={knnK})
            </button>
          </div>

          <button
            onClick={() => setPoints(INITIAL_POINTS)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset to Default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row: Accuracy, Precision, Recall, F1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Accuracy</span>
          <span className={`text-base font-bold ${metrics.accuracy > 0.85 ? "text-emerald-400" : "text-amber-400"}`}>
            {(metrics.accuracy * 100).toFixed(1)}%
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Precision (Class 1)</span>
          <span className="text-base font-bold text-cyan-300">
            {(metrics.precision * 100).toFixed(1)}%
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Recall (Class 1)</span>
          <span className={`text-base font-bold ${metrics.recall === 0 && metrics.total > 10 ? "text-rose-400" : "text-cyan-300"}`}>
            {(metrics.recall * 100).toFixed(1)}%
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">F1-Score</span>
          <span className="text-base font-bold text-zinc-200">
            {metrics.f1.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Main Grid + Confusion Matrix Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive 2D Decision Field */}
        <div className="lg:col-span-8 rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex justify-center items-center relative overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full select-none cursor-pointer touch-none"
            onClick={handleCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Background Decision Region Cells */}
            {gridCells.map((cell, idx) => {
              const cellWidth = (svgWidth - 2 * pad) / gridResolution;
              const cellHeight = (svgHeight - 2 * pad) / gridResolution;
              const sx = toSvgX(cell.x) - cellWidth / 2;
              const sy = toSvgY(cell.y) - cellHeight / 2;

              // HYDRATION FIX: Fix floating point precision to 3 decimal places
              const class1Opacity = (0.08 + cell.prob * 0.15).toFixed(3);
              const class0Opacity = (0.08 + (1 - cell.prob) * 0.15).toFixed(3);

              const fill =
                cell.pred === 1
                  ? `rgba(244, 63, 94, ${class1Opacity})`
                  : `rgba(6, 182, 212, ${class0Opacity})`;

              return (
                <rect
                  key={`cell-${idx}`}
                  x={sx}
                  y={sy}
                  width={cellWidth + 0.5}
                  height={cellHeight + 0.5}
                  fill={fill}
                />
              );
            })}

            {/* Coordinate Grid Lines */}
            <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#52525b" strokeWidth="1.2" />
            <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#52525b" strokeWidth="1.2" />

            {/* Axis Labels */}
            <text x={svgWidth - pad} y={svgHeight - pad + 18} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">Feature X₁</text>
            <text x={pad - 10} y={pad - 8} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="start">Feature X₂</text>

            {/* Render Data Points */}
            {points.map((p) => {
              const sx = toSvgX(p.x);
              const sy = toSvgY(p.y);
              const isClass1 = p.label === 1;
              const { pred } = predictPoint(p.x, p.y);
              const isMisclassified = pred !== p.label;

              return (
                <g
                  key={p.id}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => handlePointerDown(e, p.id)}
                >
                  {/* Misclassification outer ring */}
                  {isMisclassified && (
                    <circle
                      cx={sx}
                      cy={sy}
                      r="10"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                  )}

                  <circle
                    cx={sx}
                    cy={sy}
                    r={draggedId === p.id ? "7" : "5.5"}
                    fill={isClass1 ? "#f43f5e" : "#06b6d4"}
                    stroke="#18181b"
                    strokeWidth="1.5"
                  />
                  <title>{`Class ${p.label} at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}</title>
                </g>
              );
            })}
          </svg>

          {/* Canvas Bottom Legend */}
          <div className="absolute bottom-3 right-3 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 font-mono text-[10px] flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-zinc-300">Class 0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-zinc-300">Class 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-yellow-400" />
              <span className="text-yellow-400">Error</span>
            </div>
          </div>
        </div>

        {/* Right: Confusion Matrix & Breakdown */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3 font-mono text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold block">
              2×2 Confusion Matrix
            </span>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                <span className="text-[10px] text-zinc-500 block">True Neg (TN)</span>
                <span className="text-lg font-bold text-emerald-400">{metrics.tn}</span>
                <span className="text-[10px] text-zinc-400 block">Class 0 Correct</span>
              </div>
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5">
                <span className="text-[10px] text-zinc-500 block">False Pos (FP)</span>
                <span className="text-lg font-bold text-rose-400">{metrics.fp}</span>
                <span className="text-[10px] text-zinc-400 block">Type I Error</span>
              </div>
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5">
                <span className="text-[10px] text-zinc-500 block">False Neg (FN)</span>
                <span className="text-lg font-bold text-rose-400">{metrics.fn}</span>
                <span className="text-[10px] text-zinc-400 block">Type II Error</span>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                <span className="text-[10px] text-zinc-500 block">True Pos (TP)</span>
                <span className="text-lg font-bold text-emerald-400">{metrics.tp}</span>
                <span className="text-[10px] text-zinc-400 block">Class 1 Correct</span>
              </div>
            </div>
          </div>

          {/* KNN K Slider (Visible when KNN selected) */}
          {modelType === "knn" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Neighborhood Neighbors (k):</span>
                <span className="text-cyan-300 font-bold">{knnK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="9"
                step="2"
                value={knnK}
                onChange={(e) => setKnnK(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400"
              />
              <span className="text-[10px] text-zinc-500 block">
                k=1 yields irregular high-variance islands; higher k produces smooth collective voting.
              </span>
            </div>
          )}

          {/* Break Scenarios */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">
              Inject Failure Scenario:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => loadScenario("clean")}
                className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 hover:border-zinc-700 transition"
              >
                Linearly Separable
              </button>
              <button
                onClick={() => loadScenario("overlap")}
                className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 hover:border-zinc-700 transition"
              >
                Overlapping (Bayes)
              </button>
              <button
                onClick={() => loadScenario("outlier")}
                className="px-2 py-1 rounded border border-amber-500/30 bg-amber-950/20 text-[11px] text-amber-300 hover:bg-amber-900/30 transition"
              >
                Intruder Outlier
              </button>
              <button
                onClick={() => loadScenario("imbalanced")}
                className="px-2 py-1 rounded border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300 hover:bg-rose-900/30 transition"
              >
                Imbalance (95/5 Trap)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
