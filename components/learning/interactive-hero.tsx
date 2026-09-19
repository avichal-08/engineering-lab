"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { RequestFlowHero } from "@/components/learning/request-flow-hero";

// --- HERO EXPERIMENT SELECTOR ---
function HeroExperimentSelector({ activeId, setActiveId }: { activeId: string, setActiveId: (id: string) => void }) {
  const EXPERIMENTS = [
    { id: "gradient-descent", title: "Gradient Descent", desc: "Convex Optimization", target: "/learn/gradient-descent" },
    { id: "rate-limiting", title: "Rate Limiting", desc: "Token Bucket Concurrency", target: "/learn/rate-limiting" },
    { id: "k-means", title: "K-Means", desc: "Centroid Clustering", target: "/learn/k-means" }
  ];
  const activeExp = EXPERIMENTS.find(e => e.id === activeId) || EXPERIMENTS[0];

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 max-w-3xl mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between px-2 text-[10px] font-mono">
        <span className="text-cyan-500 uppercase tracking-widest flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
          Start an Experiment
        </span>
        <span className="text-zinc-500">Select Primitive</span>
      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 w-full md:w-auto">
          {EXPERIMENTS.map(exp => (
            <button
              key={exp.id}
              onClick={() => setActiveId(exp.id)}
              className={`px-3.5 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                activeId === exp.id
                  ? 'bg-zinc-800/80 text-cyan-400 border border-zinc-700/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              {exp.title}
            </button>
          ))}
        </div>

        <div className="flex-1 hidden md:block"></div>

        <Link
          href={activeExp.target}
          className="flex items-center justify-center gap-1.5 bg-cyan-400 text-zinc-950 text-xs font-bold font-mono px-5 py-2 rounded-lg hover:bg-cyan-300 transition-colors w-full md:w-auto shadow-[0_0_12px_rgba(34,211,238,0.25)]"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Run Experiment <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between px-2 pt-1 font-mono text-[10px] text-zinc-500 gap-2">
        <div className="flex items-center gap-2">
          <span>TARGET:</span>
          <Link href={activeExp.target} className="text-cyan-400 hover:underline">{activeExp.target}</Link>
          <span className="hidden sm:inline">· {activeExp.desc}</span>
        </div>
        <Link href="/learn" className="hover:text-zinc-300 transition flex items-center gap-1 group">
          All Labs <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform"/>
        </Link>
      </div>
    </div>
  );
}

// --- GRADIENT DESCENT MINI VISUALIZER ---
function GradientDescentHero() {
  const [lr, setLr] = useState(0.15);
  const [simState, setSimState] = useState({
    x: -5,
    path: [-5],
    iteration: 0,
    status: "idle", // idle, running, overshooting, unstable, converged
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simState.status === "running" || simState.status === "overshooting") {
      timer = setTimeout(() => {
        setSimState((prev) => {
          const grad = 2 * prev.x;
          const nextX = prev.x - lr * grad;
          const nextIteration = prev.iteration + 1;
          const nextPath = [...prev.path, nextX];

          // Break state: Divergence / NaN
          if (Math.abs(nextX) > 6 || isNaN(nextX)) {
            return { x: nextX, path: nextPath, iteration: nextIteration, status: "unstable" };
          }
          // Win state: Converged closely to 0
          if (Math.abs(nextX) < 0.05) {
            return { x: 0, path: [...prev.path, 0], iteration: nextIteration, status: "converged" };
          }

          // Check if it crossed the Y-axis (overshooting the minimum)
          const isOvershooting = (prev.x * nextX < 0) || Math.abs(nextX) > Math.abs(prev.x);

          return {
            x: nextX,
            path: nextPath,
            iteration: nextIteration,
            status: isOvershooting ? "overshooting" : "running",
          };
        });
      }, 350);
    }
    return () => clearTimeout(timer);
  }, [simState.status, simState.iteration, lr]);

  const start = () => setSimState(p => ({ ...p, status: "running" }));
  const reset = () => setSimState({ x: -5, path: [-5], iteration: 0, status: "idle" });

  // SVG coordinate mapping
  const mapX = (val: number) => 300 + (val / 6) * 260; // maps -6 to 6 => 40 to 560
  const mapY = (val: number) => 200 - (val / 36) * 160; // maps 0 to 36 => 200 to 40

  // Pre-calculate smooth background parabola path
  const curvePoints = [];
  for (let ix = -6; ix <= 6; ix += 0.2) {
    curvePoints.push(`${mapX(ix)},${mapY(ix * ix)}`);
  }
  const curvePath = "M " + curvePoints.join(" L ");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-6 md:p-8 overflow-hidden relative shadow-2xl space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] tracking-widest uppercase mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Live Experiment
          </div>
          <h3 className="text-zinc-100 font-serif-heading text-xl md:text-2xl font-bold tracking-tight">Gradient Descent</h3>
        </div>

        <div className="flex items-center gap-6 font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Loss</div>
            <div className="text-lg text-white font-bold">{(simState.x * simState.x).toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase mb-1">Learning Rate</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.05"
                max="1.05"
                step="0.05"
                value={lr}
                onChange={(e) => {
                  setLr(parseFloat(e.target.value));
                  if (simState.status === 'unstable' || simState.status === 'converged') reset();
                }}
                className="w-20 accent-cyan-400 cursor-ew-resize"
              />
              <span className={`text-sm ${lr > 0.5 ? 'text-amber-400' : 'text-cyan-400'} w-8`}>{lr.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Iteration</div>
            <div className="text-lg text-zinc-300 w-6">{simState.iteration}</div>
          </div>
        </div>
      </div>

      {/* Interactive 2D Loss Landscape Graph */}
      <div className="relative w-full h-48 md:h-64 bg-zinc-900/40 rounded-lg border border-zinc-800/50 flex items-center justify-center">
        {simState.status === 'unstable' && (
          <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center border border-rose-500/20 rounded-lg z-20 pointer-events-none">
            <span className="bg-zinc-950 text-rose-400 border border-rose-500/30 px-3 py-1 rounded font-mono text-xs shadow-xl">
              UNSTABLE STEP · OVERSHOOTING MINIMUM
            </span>
          </div>
        )}

        <svg viewBox="0 0 600 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Axis Grid Lines */}
          <line x1="300" y1="20" x2="300" y2="220" stroke="#3f3f46" strokeDasharray="4 4" strokeWidth="1" opacity="0.6"/>
          <line x1="20" y1="200" x2="580" y2="200" stroke="#3f3f46" strokeWidth="1" />

          {/* Smooth Quadratic Parabola Background */}
          <path d={curvePath} stroke="#52525b" strokeWidth="2" fill="none" strokeLinecap="round"/>

          {/* Connected Trajectory Path */}
          {simState.path.length > 1 && (
            <path
              d={`M ${simState.path.map(p => `${mapX(p)},${mapY(p*p)}`).join(" L ")}`}
              stroke="#22d3ee"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
              strokeDasharray="4 4"
            />
          )}

          {/* Previous Step Dots */}
          {simState.path.map((px, i) => {
            if (i === simState.path.length - 1) return null;
            return <circle key={i} cx={mapX(px)} cy={mapY(px*px)} r="3.5" fill="#0891b2" opacity="0.6" />
          })}

          {/* Current Parameter Marker */}
          {Math.abs(simState.x) <= 6 && !isNaN(simState.x) && (
            <circle
              cx={mapX(simState.x)}
              cy={mapY(simState.x * simState.x)}
              r="6.5"
              fill="#22d3ee"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          )}

          {/* Minimum Annotation */}
          <path d={`M ${mapX(0)},${mapY(0)} L ${mapX(0)},${mapY(0) + 12}`} stroke="#71717a" strokeWidth="1"/>
          <text x={mapX(0)} y={mapY(0) + 24} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="middle">MINIMUM</text>
        </svg>
      </div>

      {/* Action Controls & Destination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={simState.status === 'running' || simState.status === 'overshooting' ? reset : start}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-5 py-2.5 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            {simState.status === 'running' || simState.status === 'overshooting' ? 'Stop' : 'Run Descent'}
          </button>
          <button
            onClick={reset}
            className="flex justify-center items-center gap-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-lg font-mono text-xs transition-all"
          >
            Reset
          </button>
        </div>

        <Link href="/learn/gradient-descent" className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5">
          Explore the full Gradient Descent lab <ArrowRight className="w-3.5 h-3.5"/>
        </Link>
      </div>
    </div>
  );
}

// --- MAIN EXPORT ROUTER ---
export function InteractiveHero() {
  const [activeExperiment, setActiveExperiment] = useState("gradient-descent");

  return (
    <>
      <div className="w-full pt-1">
        <HeroExperimentSelector activeId={activeExperiment} setActiveId={setActiveExperiment} />
      </div>

      <div className="mt-14 md:mt-16 max-w-5xl mx-auto relative z-10">
        {activeExperiment === 'gradient-descent' && <GradientDescentHero />}
        {activeExperiment === 'rate-limiting' && <RequestFlowHero />}
        {activeExperiment === 'k-means' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-16 text-center text-zinc-500 font-mono text-sm shadow-xl">
            Interactive non-linear Voronoi visualizer is available in the full lab.
            <br/>
            <Link href="/learn/k-means" className="text-cyan-400 hover:text-cyan-300 hover:underline mt-6 inline-flex items-center gap-2 transition-colors">
              Open full K-Means experiment <ArrowRight className="h-3.5 w-3.5"/>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
