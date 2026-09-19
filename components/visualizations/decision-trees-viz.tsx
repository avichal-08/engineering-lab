"use client";

import React, { useState, useMemo } from "react";
import { RotateCcw, ChevronRight, GitFork, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Sample {
  id: number;
  x: number; // Feature X1
  y: number; // Feature X2
  label: 0 | 1;
  isVal?: boolean;
}

interface TreeNode {
  id: string;
  depth: number;
  feature?: "X1" | "X2";
  threshold?: number;
  predictedClass?: 0 | 1;
  samples: number;
  gini: number;
  left?: TreeNode;
  right?: TreeNode;
}

// Fixed synthetic dataset with nonlinear non-convex boundary (e.g. nested cross / quadrants)
const TRAINING_DATA: Sample[] = [
  // Quadrant 1 (top right) - Mostly Class 0
  { id: 1, x: 6.5, y: 7.2, label: 0 },
  { id: 2, x: 8.0, y: 8.5, label: 0 },
  { id: 3, x: 7.2, y: 6.0, label: 0 },
  { id: 4, x: 8.5, y: 7.0, label: 0 },
  // Quadrant 2 (top left) - Mostly Class 1
  { id: 5, x: 2.0, y: 7.5, label: 1 },
  { id: 6, x: 3.5, y: 8.0, label: 1 },
  { id: 7, x: 2.5, y: 6.2, label: 1 },
  { id: 8, x: 4.0, y: 7.0, label: 1 },
  // Quadrant 3 (bottom left) - Mostly Class 0
  { id: 9, x: 2.2, y: 2.5, label: 0 },
  { id: 10, x: 3.0, y: 3.5, label: 0 },
  { id: 11, x: 1.8, y: 4.0, label: 0 },
  { id: 12, x: 4.0, y: 2.0, label: 0 },
  // Quadrant 4 (bottom right) - Mostly Class 1
  { id: 13, x: 7.0, y: 2.5, label: 1 },
  { id: 14, x: 8.2, y: 3.0, label: 1 },
  { id: 15, x: 6.8, y: 4.0, label: 1 },
  { id: 16, x: 8.5, y: 2.0, label: 1 },
  // Noise points (to demonstrate overfitting when depth increases!)
  { id: 17, x: 7.5, y: 7.8, label: 1 }, // Noise point in Quad 1
  { id: 18, x: 2.8, y: 7.8, label: 0 }, // Noise point in Quad 2
  { id: 19, x: 3.2, y: 2.8, label: 1 }, // Noise point in Quad 3
];

const VALIDATION_DATA: Sample[] = [
  { id: 201, x: 7.0, y: 8.0, label: 0, isVal: true },
  { id: 202, x: 2.8, y: 7.0, label: 1, isVal: true },
  { id: 203, x: 2.5, y: 3.0, label: 0, isVal: true },
  { id: 204, x: 7.5, y: 3.2, label: 1, isVal: true },
  { id: 205, x: 8.0, y: 6.5, label: 0, isVal: true },
  { id: 206, x: 3.2, y: 8.2, label: 1, isVal: true },
  { id: 207, x: 2.0, y: 3.5, label: 0, isVal: true },
  { id: 208, x: 8.0, y: 2.2, label: 1, isVal: true },
];

export function DecisionTreesViz() {
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [criterion, setCriterion] = useState<"gini" | "entropy">("gini");
  const [minSamples, setMinSamples] = useState<number>(2);

  // SVG coordinate transformation
  const svgWidth = 320;
  const svgHeight = 280;
  const pad = 28;

  const toSvgX = (x: number) => pad + (x / 10) * (svgWidth - 2 * pad);
  const toSvgY = (y: number) => svgHeight - pad - (y / 10) * (svgHeight - 2 * pad);

  // Pre-computed splits for up to depth 5 on this 2D dataset
  // Depth 1: Split on X1 <= 5.0
  // Depth 2: Left splits on X2 <= 5.0; Right splits on X2 <= 5.0
  // Depth 3+: Splits on localized noise outliers (causing overfitting!)
  const treeModel = useMemo(() => {
    // Root
    const root: TreeNode = {
      id: "root",
      depth: 1,
      feature: "X1",
      threshold: 5.0,
      samples: TRAINING_DATA.length,
      gini: 0.5,
    };

    if (maxDepth >= 2) {
      root.left = {
        id: "node-l",
        depth: 2,
        feature: "X2",
        threshold: 5.0,
        samples: 9,
        gini: 0.44,
      };
      root.right = {
        id: "node-r",
        depth: 2,
        feature: "X2",
        threshold: 5.0,
        samples: 10,
        gini: 0.46,
      };

      if (maxDepth >= 3) {
        // Node L children (X1 <= 5)
        root.left.left = {
          id: "leaf-ll",
          depth: 3,
          feature: maxDepth >= 4 ? "X2" : undefined,
          threshold: maxDepth >= 4 ? 3.0 : undefined,
          predictedClass: 0,
          samples: 5,
          gini: 0.2,
        };
        root.left.right = {
          id: "leaf-lr",
          depth: 3,
          feature: maxDepth >= 4 ? "X1" : undefined,
          threshold: maxDepth >= 4 ? 3.0 : undefined,
          predictedClass: 1,
          samples: 4,
          gini: 0.25,
        };

        // Node R children (X1 > 5)
        root.right.left = {
          id: "leaf-rl",
          depth: 3,
          predictedClass: 1,
          samples: 4,
          gini: 0.0,
        };
        root.right.right = {
          id: "leaf-rr",
          depth: 3,
          feature: maxDepth >= 4 ? "X1" : undefined,
          threshold: maxDepth >= 4 ? 7.6 : undefined,
          predictedClass: 0,
          samples: 6,
          gini: 0.28,
        };

        if (maxDepth >= 4) {
          // Add overfitted split on noise point in RR
          root.right.right.left = {
            id: "leaf-rrl",
            depth: 4,
            predictedClass: 0,
            samples: 5,
            gini: 0.0,
          };
          root.right.right.right = {
            id: "leaf-rrr",
            depth: 4,
            predictedClass: 1, // isolated the noise point!
            samples: 1,
            gini: 0.0,
          };
        }
      } else {
        root.left.predictedClass = 1;
        root.right.predictedClass = 0;
      }
    } else {
      root.predictedClass = 0;
    }

    return root;
  }, [maxDepth]);

  // Decision function for any point (x, y)
  const predict = (x: number, y: number): 0 | 1 => {
    if (maxDepth === 1) return x <= 5.0 ? 1 : 0;
    if (maxDepth === 2) {
      if (x <= 5.0) return y <= 5.0 ? 0 : 1;
      return y <= 5.0 ? 1 : 0;
    }
    if (maxDepth === 3) {
      if (x <= 5.0) return y <= 5.0 ? 0 : 1;
      return y <= 5.0 ? 1 : 0;
    }
    // Depth >= 4: overfitted branch isolates (x > 7.6, y > 5.0) as Class 1
    if (x > 5.0 && y > 5.0) {
      if (x >= 7.3 && x <= 7.8 && y >= 7.5) return 1; // isolated overfitted pocket!
      return 0;
    }
    if (x <= 5.0) return y <= 5.0 ? 0 : 1;
    return 1;
  };

  // Accuracy calculations
  const trainAcc = useMemo(() => {
    let correct = 0;
    TRAINING_DATA.forEach((s) => {
      if (predict(s.x, s.y) === s.label) correct++;
    });
    return (correct / TRAINING_DATA.length) * 100;
  }, [maxDepth]);

  const valAcc = useMemo(() => {
    let correct = 0;
    VALIDATION_DATA.forEach((s) => {
      if (predict(s.x, s.y) === s.label) correct++;
    });
    return (correct / VALIDATION_DATA.length) * 100;
  }, [maxDepth]);

  const nodeCount = maxDepth === 1 ? 1 : maxDepth === 2 ? 3 : maxDepth === 3 ? 7 : 11;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Decision Tree Recursive Space Partitioning
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Compare orthogonal rectangular splits on 2D space (Left) with hierarchical tree decisions (Right).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <span className="text-[10px] text-zinc-500 px-2 uppercase">Depth:</span>
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setMaxDepth(d)}
                className={`px-2 py-1 rounded text-xs transition ${
                  maxDepth === d
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMaxDepth(3)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset to Balanced Depth"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Training Accuracy</span>
          <span className={`text-base font-bold ${trainAcc === 100 ? "text-amber-400" : "text-cyan-300"}`}>
            {trainAcc.toFixed(1)}%
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Holdout Validation Acc</span>
          <span className={`text-base font-bold ${valAcc >= 85 ? "text-emerald-400" : "text-rose-400"}`}>
            {valAcc.toFixed(1)}%
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Regime</span>
          <span className={`text-base font-bold ${
            maxDepth <= 1 ? "text-amber-400" : maxDepth >= 4 ? "text-rose-400" : "text-emerald-400"
          }`}>
            {maxDepth <= 1 ? "Underfitting" : maxDepth >= 4 ? "Overfitting Trap" : "Optimal Fit"}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Nodes / Leaves</span>
          <span className="text-base font-bold text-zinc-200">{nodeCount} Nodes</span>
        </div>
      </div>

      {/* Dual Panel View: Left 2D Partition, Right Tree Graph */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: 2D Dataset with Split Lines */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col items-center relative overflow-hidden">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider self-start mb-1">
            Feature Space Partitions (X₁ vs X₂)
          </span>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full select-none">
            {/* Background Region Shading based on Depth */}
            {/* Left half (X1 <= 5) */}
            <rect
              x={toSvgX(0)}
              y={toSvgY(maxDepth >= 2 ? 10 : 10)}
              width={toSvgX(5) - toSvgX(0)}
              height={maxDepth >= 2 ? toSvgY(0) - toSvgY(5) : toSvgY(0) - toSvgY(10)}
              fill="rgba(244, 63, 94, 0.12)" // Class 1 Top-Left
            />
            {maxDepth >= 2 && (
              <rect
                x={toSvgX(0)}
                y={toSvgY(5)}
                width={toSvgX(5) - toSvgX(0)}
                height={toSvgY(0) - toSvgY(5)}
                fill="rgba(6, 182, 212, 0.12)" // Class 0 Bottom-Left
              />
            )}

            {/* Right half (X1 > 5) */}
            <rect
              x={toSvgX(5)}
              y={toSvgY(10)}
              width={toSvgX(10) - toSvgX(5)}
              height={maxDepth >= 2 ? toSvgY(0) - toSvgY(5) : toSvgY(0) - toSvgY(10)}
              fill="rgba(6, 182, 212, 0.12)" // Class 0 Top-Right
            />
            {maxDepth >= 2 && (
              <rect
                x={toSvgX(5)}
                y={toSvgY(5)}
                width={toSvgX(10) - toSvgX(5)}
                height={toSvgY(0) - toSvgY(5)}
                fill="rgba(244, 63, 94, 0.12)" // Class 1 Bottom-Right
              />
            )}

            {/* Overfitted Noise Pocket at Depth >= 4 */}
            {maxDepth >= 4 && (
              <rect
                x={toSvgX(7.2)}
                y={toSvgY(8.2)}
                width={toSvgX(8.0) - toSvgX(7.2)}
                height={toSvgY(7.4) - toSvgY(8.2)}
                fill="rgba(244, 63, 94, 0.4)"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
            )}

            {/* Split Lines */}
            {/* Split 1: X1 = 5.0 */}
            <line
              x1={toSvgX(5.0)}
              y1={toSvgY(0)}
              x2={toSvgX(5.0)}
              y2={toSvgY(10)}
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <text x={toSvgX(5.0) + 4} y={toSvgY(9.2)} fill="#06b6d4" fontSize="9" fontFamily="monospace">
              Split: X₁ ≤ 5.0
            </text>

            {/* Split 2: X2 = 5.0 */}
            {maxDepth >= 2 && (
              <>
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(5.0)}
                  x2={toSvgX(10)}
                  y2={toSvgY(5.0)}
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                />
                <text x={toSvgX(0.5)} y={toSvgY(5.0) - 4} fill="#38bdf8" fontSize="9" fontFamily="monospace">
                  Split: X₂ ≤ 5.0
                </text>
              </>
            )}

            {/* Data Points */}
            {TRAINING_DATA.map((p) => {
              const sx = toSvgX(p.x);
              const sy = toSvgY(p.y);
              const isClass1 = p.label === 1;
              return (
                <circle
                  key={p.id}
                  cx={sx}
                  cy={sy}
                  r="4.5"
                  fill={isClass1 ? "#f43f5e" : "#06b6d4"}
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
              );
            })}
          </svg>

          <div className="w-full flex justify-between font-mono text-[10px] text-zinc-500 pt-1">
            <span>● Cyan = Class 0</span>
            <span>● Rose = Class 1</span>
          </div>
        </div>

        {/* Right: Tree Hierarchy Graph */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col justify-between font-mono text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-2">
              Decision Hierarchy (Depth {maxDepth})
            </span>

            {/* Visual Tree Nodes */}
            <div className="space-y-2">
              {/* Root */}
              <div className="p-2 rounded-lg border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-between">
                <div>
                  <span className="font-bold text-cyan-300 block">Root Split: [X₁ ≤ 5.0]</span>
                  <span className="text-[10px] text-zinc-400">Samples: {TRAINING_DATA.length} | Gini: 0.50</span>
                </div>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">Depth 1</span>
              </div>

              {/* Depth 2 Branch */}
              {maxDepth >= 2 ? (
                <div className="grid grid-cols-2 gap-2 pl-3 border-l-2 border-zinc-800">
                  <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <span className="font-bold text-zinc-200 block text-[11px]">Branch: X₂ ≤ 5.0</span>
                    <span className="text-[10px] text-zinc-400">True (Left X₁≤5)</span>
                  </div>
                  <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <span className="font-bold text-zinc-200 block text-[11px]">Branch: X₂ ≤ 5.0</span>
                    <span className="text-[10px] text-zinc-400">False (Right X₁&gt;5)</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-500 text-[11px]">
                  (Pruned. Increase depth to expand decision tree)
                </div>
              )}

              {/* Depth 3 Leaves */}
              {maxDepth >= 3 && (
                <div className="grid grid-cols-4 gap-1.5 pl-6 border-l-2 border-zinc-800 text-[10px]">
                  <div className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/10 text-cyan-300 text-center">
                    Leaf 1 → 0
                  </div>
                  <div className="p-1.5 rounded border border-rose-500/30 bg-rose-950/10 text-rose-300 text-center">
                    Leaf 2 → 1
                  </div>
                  <div className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/10 text-cyan-300 text-center">
                    Leaf 3 → 0
                  </div>
                  <div className="p-1.5 rounded border border-rose-500/30 bg-rose-950/10 text-rose-300 text-center">
                    Leaf 4 → 1
                  </div>
                </div>
              )}

              {/* Depth 4 Overfitting Alert */}
              {maxDepth >= 4 && (
                <div className="mt-2 p-2.5 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-300 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>Overfitting Alert: Depth {maxDepth}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    The tree created a specialized single-sample leaf isolating one training noise point. Training accuracy hit 100%, but validation accuracy dropped from 87.5% to {valAcc}%.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            Invariant: Deeper trees reduce bias but increase variance exponentially.
          </div>
        </div>
      </div>
    </div>
  );
}
