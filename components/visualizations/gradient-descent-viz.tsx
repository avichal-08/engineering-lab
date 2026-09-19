"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, AlertOctagon, TrendingDown, ChevronRight, Compass } from "lucide-react";

type LandscapeMode = "convex-bowl" | "non-convex" | "plateau";

interface HistoryPoint {
  w: number;
  loss: number;
}

export function GradientDescentViz() {
  const [landscape, setLandscape] = useState<LandscapeMode>("convex-bowl");
  const [learningRate, setLearningRate] = useState<number>(0.15);
  const [position, setPosition] = useState<number>(3.8); // w starting position
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(80);
  const [history, setHistory] = useState<HistoryPoint[]>([{ w: 3.8, loss: 0 }]);
  const [hasDiverged, setHasDiverged] = useState<boolean>(false);

  // Landscape function definitions
  // 1. Convex bowl: J(w) = 0.5 * w^2  => dJ/dw = w. Minimum at w = 0, J = 0
  // 2. Non-convex with local minima: J(w) = 0.1 * w^4 - 0.8 * w^2 + 0.1 * w + 2
  //    dJ/dw = 0.4 * w^3 - 1.6 * w + 0.1
  // 3. Saddle / Plateau: J(w) = 0.05 * w^3 + 0.02 * w^2 + 0.2
  //    dJ/dw = 0.15 * w^2 + 0.04 * w
  const computeLoss = useCallback((w: number, mode: LandscapeMode): number => {
    switch (mode) {
      case "convex-bowl":
        return 0.5 * Math.pow(w, 2);
      case "non-convex":
        return 0.08 * Math.pow(w, 4) - 0.6 * Math.pow(w, 2) + 0.05 * w + 2.5;
      case "plateau":
        return 0.05 * Math.pow(w, 3) + 0.05 * Math.pow(w, 2) + 1.2;
    }
  }, []);

  const computeGradient = useCallback((w: number, mode: LandscapeMode): number => {
    switch (mode) {
      case "convex-bowl":
        return w;
      case "non-convex":
        return 0.32 * Math.pow(w, 3) - 1.2 * w + 0.05;
      case "plateau":
        return 0.15 * Math.pow(w, 2) + 0.1 * w;
    }
  }, []);

  const globalMinW = landscape === "convex-bowl" ? 0 : landscape === "non-convex" ? 1.88 : 0;
  const currentLoss = computeLoss(position, landscape);
  const currentGrad = computeGradient(position, landscape);
  const distanceToMin = Math.abs(position - globalMinW);

  // Step function
  const step = useCallback(() => {
    if (hasDiverged) return;

    const grad = computeGradient(position, landscape);
    const nextW = position - learningRate * grad;

    if (Math.abs(nextW) > 15 || isNaN(nextW)) {
      setHasDiverged(true);
      setIsRunning(false);
      return;
    }

    const nextLoss = computeLoss(nextW, landscape);
    setPosition(nextW);
    setHistory((prev) => [...prev.slice(-40), { w: nextW, loss: nextLoss }]);

    if (Math.abs(grad) < 0.001) {
      setIsRunning(false); // converged
    }
  }, [hasDiverged, position, landscape, learningRate, computeGradient, computeLoss]);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(step, speedMs);
      return () => clearInterval(interval);
    }
  }, [isRunning, step, speedMs]);

  const resetTo = (startW: number, lr: number = learningRate) => {
    setIsRunning(false);
    setHasDiverged(false);
    setPosition(startW);
    setLearningRate(lr);
    setHistory([{ w: startW, loss: computeLoss(startW, landscape) }]);
  };

  const handleLandscapeChange = (mode: LandscapeMode) => {
    setLandscape(mode);
    const startW = mode === "non-convex" ? -2.8 : 3.6;
    resetTo(startW);
  };

  // SVG coordinate transformation
  // w in [-4.5, 4.5], Loss in [0, 8]
  const svgWidth = 560;
  const svgHeight = 280;
  const padX = 40;
  const padY = 30;

  const toSvgX = (w: number) => padX + ((w + 4.5) / 9) * (svgWidth - 2 * padX);
  const toSvgY = (loss: number) => svgHeight - padY - (Math.max(0, Math.min(8, loss)) / 8) * (svgHeight - 2 * padY);

  // Generate curve path
  const curvePoints: [number, number][] = [];
  for (let w = -4.5; w <= 4.5; w += 0.1) {
    const l = computeLoss(w, landscape);
    curvePoints.push([toSvgX(w), toSvgY(l)]);
  }
  const pathData = curvePoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`,
    ""
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              2D Gradient Descent Optimization Engine
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Rule: <span className="font-mono text-cyan-300">θ_new = θ - η · ∇J(θ)</span>. Step along negative gradient to reach minimum.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={hasDiverged}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isRunning
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
                : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
            }`}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isRunning ? "Pause" : "Descend"}</span>
          </button>

          <button
            onClick={step}
            disabled={isRunning || hasDiverged}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition disabled:opacity-40"
          >
            <span>Step</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => resetTo(landscape === "non-convex" ? -2.8 : 3.6)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset Position"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Loss J(θ)</span>
          <span className={`text-base font-bold ${hasDiverged ? "text-rose-400" : currentLoss < 0.05 ? "text-emerald-400" : "text-cyan-300"}`}>
            {hasDiverged ? "∞ DIVERGED" : currentLoss.toFixed(4)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Position (θ)</span>
          <span className="text-base font-bold text-zinc-100">
            {hasDiverged ? "NaN" : position.toFixed(3)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Gradient (∇J)</span>
          <span className="text-base font-bold text-amber-300">
            {hasDiverged ? "NaN" : currentGrad.toFixed(3)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Distance to Min</span>
          <span className="text-base font-bold text-zinc-300">
            {hasDiverged ? "∞" : distanceToMin.toFixed(3)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Iterations</span>
          <span className="text-base font-bold text-zinc-400">{history.length - 1}</span>
        </div>
      </div>

      {/* Divergence Warning */}
      {hasDiverged && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            Gradient divergence! Learning rate (η = {learningRate}) exceeded the Lipschitz smoothness bound, causing oscillation over the valley into infinity.
          </span>
          <button
            onClick={() => resetTo(3.6, 0.1)}
            className="ml-auto underline hover:text-white"
          >
            Fix Learning Rate
          </button>
        </div>
      )}

      {/* Main 2D Loss Landscape Visualizer */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-3 overflow-hidden flex flex-col items-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[600px] select-none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Background Reference Grid */}
          <line x1={padX} y1={svgHeight - padY} x2={svgWidth - padX} y2={svgHeight - padY} stroke="#3f3f46" strokeWidth="1" />
          <line x1={toSvgX(0)} y1={padY} x2={toSvgX(0)} y2={svgHeight - padY} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />

          {/* Loss Curve Area Fill */}
          <path
            d={`${pathData} L ${svgWidth - padX} ${svgHeight - padY} L ${padX} ${svgHeight - padY} Z`}
            fill="url(#curveGradient)"
          />

          {/* Loss Curve Line */}
          <path d={pathData} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

          {/* Axis Labels */}
          <text x={svgWidth - padX} y={svgHeight - padY + 18} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">Parameter θ</text>
          <text x={padX} y={padY - 8} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="start">Loss J(θ)</text>

          {/* Trajectory History (Path of descent) */}
          {history.length > 1 &&
            history.map((pt, idx) => {
              if (idx === 0) return null;
              const prev = history[idx - 1];
              return (
                <line
                  key={`hist-line-${idx}`}
                  x1={toSvgX(prev.w)}
                  y1={toSvgY(prev.loss)}
                  x2={toSvgX(pt.w)}
                  y2={toSvgY(pt.loss)}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  opacity={0.3 + (idx / history.length) * 0.7}
                />
              );
            })}

          {/* History Dots */}
          {history.map((pt, idx) => (
            <circle
              key={`hist-dot-${idx}`}
              cx={toSvgX(pt.w)}
              cy={toSvgY(pt.loss)}
              r={idx === 0 ? "4.5" : "2.5"}
              fill={idx === 0 ? "#a855f7" : "#0284c7"}
              opacity={idx === 0 ? 1 : 0.4 + (idx / history.length) * 0.6}
            />
          ))}

          {/* Current Parameter Ball */}
          {!hasDiverged && (
            <g>
              {/* Tangent Slope Line */}
              <line
                x1={toSvgX(position) - 30}
                y1={toSvgY(currentLoss) + (currentGrad * 30 * (svgHeight / 8)) / (svgWidth / 9)}
                x2={toSvgX(position) + 30}
                y2={toSvgY(currentLoss) - (currentGrad * 30 * (svgHeight / 8)) / (svgWidth / 9)}
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* Descent Step Vector Arrow */}
              <line
                x1={toSvgX(position)}
                y1={toSvgY(currentLoss)}
                x2={toSvgX(position - learningRate * currentGrad)}
                y2={toSvgY(currentLoss)}
                stroke="#38bdf8"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />

              {/* Glowing Indicator Ball */}
              <circle
                cx={toSvgX(position)}
                cy={toSvgY(currentLoss)}
                r="7"
                fill="#22d3ee"
                stroke="#083344"
                strokeWidth="2"
                className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              />
            </g>
          )}

          {/* Start Marker Label */}
          {history.length > 0 && (
            <text
              x={toSvgX(history[0].w)}
              y={toSvgY(history[0].loss) - 10}
              fill="#c084fc"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              START ●
            </text>
          )}

          {/* Global Min Marker */}
          <text
            x={toSvgX(globalMinW)}
            y={toSvgY(computeLoss(globalMinW, landscape)) + 18}
            fill="#34d399"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            ★ MINIMUM
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 font-mono text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>Current Parameter θ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-amber-400" />
            <span>Tangent Slope ∇J</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Start Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">★</span>
            <span>Target Global Minimum</span>
          </div>
        </div>
      </div>

      {/* Control Panels: Landscape, Learning Rate & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80">
        {/* Landscape Selector */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Loss Landscape Geometry:
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => handleLandscapeChange("convex-bowl")}
              className={`px-2.5 py-1.5 rounded-lg border text-left transition ${
                landscape === "convex-bowl"
                  ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-200"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              1. Convex Quadratic Bowl (J = 0.5θ²)
            </button>
            <button
              onClick={() => handleLandscapeChange("non-convex")}
              className={`px-2.5 py-1.5 rounded-lg border text-left transition ${
                landscape === "non-convex"
                  ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-200"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              2. Non-Convex (Local Minima Trap)
            </button>
            <button
              onClick={() => handleLandscapeChange("plateau")}
              className={`px-2.5 py-1.5 rounded-lg border text-left transition ${
                landscape === "plateau"
                  ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-200"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              3. Saddle Plateau (Vanishing Slope)
            </button>
          </div>
        </div>

        {/* Learning Rate Slider & Speed */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Learning Rate (η):</span>
              <span className={`font-bold ${learningRate >= 1.0 ? "text-rose-400" : learningRate < 0.05 ? "text-amber-400" : "text-cyan-300"}`}>
                {learningRate} {learningRate >= 1.0 ? "(Divergent)" : learningRate < 0.05 ? "(Slow)" : "(Optimal)"}
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.25"
              step="0.01"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Starting Position (θ):</span>
              <span className="text-zinc-200">{position.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="4.0"
              step="0.1"
              value={position}
              onChange={(e) => resetTo(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        {/* 3 Canonical Regime Presets */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Key Learning Regimes:
          </span>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => resetTo(3.8, 0.02)}
              className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/10 text-amber-300 hover:bg-amber-900/20 text-left transition"
            >
              • Small Rate (η = 0.02): Slow crawl
            </button>
            <button
              onClick={() => resetTo(3.8, 0.25)}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 text-emerald-300 hover:bg-emerald-900/20 text-left transition"
            >
              • Healthy Rate (η = 0.25): Fast convergence
            </button>
            <button
              onClick={() => resetTo(3.8, 1.15)}
              className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/10 text-rose-300 hover:bg-rose-900/20 text-left transition"
            >
              • Excessive Rate (η = 1.15): Divergence / Overshoot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
