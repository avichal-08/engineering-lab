"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Sparkles, AlertTriangle, ChevronRight } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

const DEFAULT_POINTS: Point[] = [
  { x: 1.0, y: 1.8 },
  { x: 2.0, y: 2.7 },
  { x: 3.0, y: 3.2 },
  { x: 4.0, y: 4.5 },
  { x: 5.0, y: 5.1 },
  { x: 6.0, y: 6.4 },
  { x: 7.0, y: 7.2 },
  { x: 8.0, y: 8.0 },
];

export function LinearRegressionViz() {
  const [points, setPoints] = useState<Point[]>(DEFAULT_POINTS);
  const [weight, setWeight] = useState<number>(0.1);
  const [bias, setBias] = useState<number>(0.5);
  const [learningRate, setLearningRate] = useState<number>(0.03);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [iterations, setIterations] = useState<number>(0);
  const [isDiverging, setIsDiverging] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const animRef = useRef<number | null>(null);

  // SVG coordinate mapping
  // World space: x in [0, 10], y in [0, 10]
  const svgWidth = 520;
  const svgHeight = 340;
  const pad = 40;

  const toSvgX = (x: number) => pad + (x / 10) * (svgWidth - 2 * pad);
  const toSvgY = (y: number) => svgHeight - pad - (y / 10) * (svgHeight - 2 * pad);
  const fromSvgX = (sx: number) => Math.max(0.5, Math.min(9.5, ((sx - pad) / (svgWidth - 2 * pad)) * 10));
  const fromSvgY = (sy: number) => Math.max(0.5, Math.min(9.5, ((svgHeight - pad - sy) / (svgHeight - 2 * pad)) * 10));

  // Compute Loss (MSE)
  const mse = points.reduce((acc, p) => {
    const pred = weight * p.x + bias;
    return acc + Math.pow(p.y - pred, 2);
  }, 0) / (points.length || 1);

  // Gradient descent step
  const step = useCallback(() => {
    if (points.length === 0) return;

    let dW = 0;
    let dB = 0;
    const n = points.length;

    for (const p of points) {
      const pred = weight * p.x + bias;
      const error = pred - p.y;
      dW += (2 / n) * error * p.x;
      dB += (2 / n) * error;
    }

    const nextW = weight - learningRate * dW;
    const nextB = bias - learningRate * dB;

    if (Math.abs(nextW) > 50 || Math.abs(nextB) > 50 || isNaN(nextW)) {
      setIsDiverging(true);
      setIsRunning(false);
      return;
    }

    setWeight(nextW);
    setBias(nextB);
    setIterations((it) => it + 1);
  }, [points, weight, bias, learningRate]);

  useEffect(() => {
    if (isRunning) {
      const timer = setInterval(() => {
        step();
      }, 40);
      return () => clearInterval(timer);
    }
  }, [isRunning, step]);

  const generateData = (noise: number, hasOutlier = false) => {
    const trueSlope = 0.85;
    const trueIntercept = 1.2;
    const newPoints: Point[] = [];
    for (let x = 1; x <= 9; x += 1) {
      const randomNoise = (Math.random() - 0.5) * noise * 2;
      const y = Math.max(0.5, Math.min(9.5, trueSlope * x + trueIntercept + randomNoise));
      newPoints.push({ x, y: Number(y.toFixed(2)) });
    }
    if (hasOutlier) {
      newPoints.push({ x: 8.5, y: 1.0 }); // Extreme leverage outlier
    }
    setPoints(newPoints);
    setIterations(0);
    setIsDiverging(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsDiverging(false);
    setWeight(0.1);
    setBias(0.5);
    setIterations(0);
  };

  const triggerDivergence = () => {
    setIsRunning(false);
    setLearningRate(0.85); // excessively high for normalized data
    setIsDiverging(false);
  };

  const handlePointerDown = (index: number) => {
    setDraggedIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const newX = Number(fromSvgX(sx).toFixed(2));
    const newY = Number(fromSvgY(sy).toFixed(2));

    setPoints((prev) => {
      const updated = [...prev];
      updated[draggedIndex] = { x: newX, y: newY };
      return updated;
    });
  };

  const handlePointerUp = () => {
    setDraggedIndex(null);
  };

  // Regression line start and end (x=0 to x=10)
  const lineY0 = weight * 0 + bias;
  const lineY10 = weight * 10 + bias;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Linear Regression & Residual Minimization
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Model: <span className="font-mono text-cyan-300">ŷ = w·x + b</span>. Drag points or tweak learning rate to inspect convergence.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={isDiverging}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isRunning
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
                : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
            }`}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isRunning ? "Pause" : "Train"}</span>
          </button>

          <button
            onClick={step}
            disabled={isRunning || isDiverging}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition disabled:opacity-40"
          >
            <span>Step</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset Parameters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">MSE Loss</span>
          <span className={`text-base font-bold ${isDiverging ? "text-rose-400" : mse < 0.5 ? "text-emerald-400" : "text-cyan-300"}`}>
            {isDiverging ? "∞ DIVERGED" : mse.toFixed(4)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Weight (Slope w)</span>
          <span className="text-base font-bold text-zinc-100">{isDiverging ? "NaN" : weight.toFixed(3)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Bias (Intercept b)</span>
          <span className="text-base font-bold text-zinc-100">{isDiverging ? "NaN" : bias.toFixed(3)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Iterations</span>
          <span className="text-base font-bold text-zinc-300">{iterations}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Data Points</span>
          <span className="text-base font-bold text-zinc-400">{points.length} (Draggable)</span>
        </div>
      </div>

      {/* Divergence Alert */}
      {isDiverging && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            Gradient explosion! Learning rate (α = {learningRate}) overstepped the loss curvature, causing parameters to oscillate outward to infinity.
          </span>
          <button
            onClick={handleReset}
            className="ml-auto underline hover:text-white"
          >
            Reset
          </button>
        </div>
      )}

      {/* Main Plot Area */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex justify-center items-center overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] select-none cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="reg-grid" width="44" height="30" patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 30" fill="none" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect x={pad} y={pad} width={svgWidth - 2 * pad} height={svgHeight - 2 * pad} fill="url(#reg-grid)" />

          {/* Axes */}
          <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#52525b" strokeWidth="1.5" />
          <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#52525b" strokeWidth="1.5" />

          {/* Axis Labels */}
          <text x={svgWidth - pad} y={svgHeight - pad + 20} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">Feature (x)</text>
          <text x={pad - 10} y={pad - 8} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="start">Target (y)</text>

          {/* Residual Lines (Data Point to Prediction) */}
          {!isDiverging && points.map((p, idx) => {
            const predY = weight * p.x + bias;
            const sx = toSvgX(p.x);
            const sy = toSvgY(p.y);
            const sPredY = toSvgY(predY);
            return (
              <line
                key={`res-${idx}`}
                x1={sx}
                y1={sy}
                x2={sx}
                y2={sPredY}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.8"
              />
            );
          })}

          {/* Regression Line */}
          {!isDiverging && (
            <line
              x1={toSvgX(0)}
              y1={toSvgY(lineY0)}
              x2={toSvgX(10)}
              y2={toSvgY(lineY10)}
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
          )}

          {/* Prediction Points on Line */}
          {!isDiverging && points.map((p, idx) => {
            const predY = weight * p.x + bias;
            return (
              <circle
                key={`pred-${idx}`}
                cx={toSvgX(p.x)}
                cy={toSvgY(predY)}
                r="3"
                fill="#0891b2"
                stroke="#ecfeff"
                strokeWidth="1"
              />
            );
          })}

          {/* Draggable Data Points */}
          {points.map((p, idx) => (
            <g key={`point-${idx}`} className="cursor-grab active:cursor-grabbing">
              <circle
                cx={toSvgX(p.x)}
                cy={toSvgY(p.y)}
                r={draggedIndex === idx ? "7" : "5"}
                fill="#38bdf8"
                stroke="#082f49"
                strokeWidth="1.5"
                onPointerDown={() => handlePointerDown(idx)}
              />
              <title>{`Point ${idx + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}</title>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute top-4 right-4 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 font-mono text-[10px] space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-zinc-300">Data Point (Draggable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-cyan-400" />
            <span className="text-zinc-300">Fitted Line ŷ = wx + b</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-rose-500 border-b border-dashed border-rose-500" />
            <span className="text-zinc-300">Residual Error (y - ŷ)</span>
          </div>
        </div>
      </div>

      {/* Control Sliders & Preset Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
        {/* Sliders */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Learning Rate (α):</span>
              <span className={`font-bold ${learningRate > 0.4 ? "text-rose-400" : "text-cyan-300"}`}>
                {learningRate} {learningRate > 0.4 ? "(High Risk)" : ""}
              </span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.8"
              step="0.005"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Dataset Noise (σ):</span>
              <span className="text-zinc-200">{noiseLevel}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.5"
              step="0.1"
              value={noiseLevel}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setNoiseLevel(n);
                generateData(n);
              }}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        {/* Presets & Break Experiments */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Failure & Experiment Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generateData(0.2)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              Clean Linear
            </button>
            <button
              onClick={() => generateData(1.8)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              Noisy Data
            </button>
            <button
              onClick={() => generateData(0.5, true)}
              className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition"
            >
              Leverage Outlier
            </button>
            <button
              onClick={triggerDivergence}
              className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 transition"
            >
              Exploding Rate (Break)
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
            Observe: Increasing α beyond the curvature boundary causes the residual error to oscillate wildly instead of minimizing.
          </p>
        </div>
      </div>
    </div>
  );
}
