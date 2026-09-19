"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, Grid, Eye, Cpu, Sliders, ArrowRight } from "lucide-react";

const TOKENS = ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "tired"];

// Realistic Attention Weight matrices for 3 distinct attention heads
// Head 1: Co-reference Resolution ("it" attends strongly to "animal" and "tired")
// Head 2: Syntactic Verb-Object dependencies ("cross" attends to "animal" and "street")
// Head 3: Positional Locality (attends primarily to immediate neighbor tokens)
const BASE_ATTENTION: Record<1 | 2 | 3, number[][]> = {
  1: [
    // The, animal, didn't, cross, the, street, because, it, was, tired
    [0.70, 0.20, 0.02, 0.01, 0.02, 0.02, 0.01, 0.01, 0.00, 0.01], // The
    [0.05, 0.75, 0.04, 0.08, 0.01, 0.02, 0.01, 0.01, 0.01, 0.02], // animal
    [0.01, 0.05, 0.60, 0.25, 0.01, 0.01, 0.02, 0.02, 0.01, 0.02], // didn't
    [0.02, 0.35, 0.10, 0.20, 0.03, 0.25, 0.01, 0.01, 0.01, 0.02], // cross
    [0.01, 0.02, 0.01, 0.02, 0.70, 0.20, 0.01, 0.01, 0.01, 0.01], // the
    [0.01, 0.04, 0.01, 0.30, 0.04, 0.55, 0.01, 0.01, 0.01, 0.02], // street
    [0.01, 0.02, 0.04, 0.08, 0.01, 0.02, 0.65, 0.10, 0.02, 0.05], // because
    [0.01, 0.68, 0.02, 0.03, 0.01, 0.04, 0.03, 0.02, 0.02, 0.14], // IT -> ANIMAL (0.68), TIRED (0.14)
    [0.01, 0.03, 0.02, 0.02, 0.01, 0.02, 0.02, 0.25, 0.50, 0.12], // was
    [0.01, 0.40, 0.02, 0.03, 0.01, 0.02, 0.02, 0.35, 0.05, 0.09], // tired -> ANIMAL (0.40), IT (0.35)
  ],
  2: [
    // Syntactic Verb/Action
    [0.1, 0.6, 0.05, 0.1, 0.02, 0.03, 0.02, 0.02, 0.02, 0.04],
    [0.1, 0.3, 0.2, 0.3, 0.01, 0.03, 0.01, 0.01, 0.01, 0.03],
    [0.02, 0.08, 0.3, 0.5, 0.01, 0.03, 0.02, 0.01, 0.01, 0.02],
    [0.03, 0.35, 0.15, 0.1, 0.02, 0.3, 0.01, 0.01, 0.01, 0.02], // cross -> animal & street
    [0.02, 0.02, 0.01, 0.05, 0.2, 0.65, 0.01, 0.01, 0.01, 0.02],
    [0.02, 0.05, 0.01, 0.5, 0.02, 0.35, 0.01, 0.01, 0.01, 0.02],
    [0.01, 0.04, 0.05, 0.25, 0.01, 0.04, 0.45, 0.05, 0.02, 0.08],
    [0.01, 0.2, 0.03, 0.05, 0.01, 0.05, 0.05, 0.4, 0.1, 0.1],
    [0.01, 0.05, 0.02, 0.05, 0.01, 0.02, 0.02, 0.2, 0.45, 0.17],
    [0.02, 0.2, 0.02, 0.08, 0.01, 0.02, 0.05, 0.2, 0.1, 0.3],
  ],
  3: [
    // Positional locality (diagonal band)
    [0.6, 0.3, 0.05, 0.02, 0.01, 0.01, 0.0, 0.0, 0.0, 0.01],
    [0.2, 0.5, 0.25, 0.03, 0.01, 0.0, 0.0, 0.0, 0.0, 0.01],
    [0.02, 0.2, 0.55, 0.2, 0.02, 0.0, 0.0, 0.0, 0.0, 0.01],
    [0.01, 0.03, 0.25, 0.45, 0.2, 0.04, 0.01, 0.0, 0.0, 0.01],
    [0.0, 0.01, 0.02, 0.2, 0.5, 0.25, 0.01, 0.0, 0.0, 0.01],
    [0.0, 0.0, 0.01, 0.05, 0.2, 0.55, 0.18, 0.01, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.02, 0.02, 0.2, 0.5, 0.22, 0.02, 0.02],
    [0.0, 0.0, 0.0, 0.01, 0.01, 0.02, 0.25, 0.45, 0.22, 0.04],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.01, 0.03, 0.25, 0.45, 0.26],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.01, 0.05, 0.3, 0.64],
  ],
};

export function AttentionViz() {
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number>(7); // Token "it" by default
  const [activeHead, setActiveHead] = useState<1 | 2 | 3>(1);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<"arcs" | "matrix" | "qkv">("arcs");

  // Re-scale weights with temperature: softmax(logits / tau)
  const adjustedWeights = useMemo(() => {
    const rawMatrix = BASE_ATTENTION[activeHead];
    return rawMatrix.map((row) => {
      // Approximate logits from probabilities
      const logits = row.map((p) => Math.log(Math.max(1e-5, p)));
      const scaledLogits = logits.map((l) => l / temperature);
      const maxL = Math.max(...scaledLogits);
      const exps = scaledLogits.map((l) => Math.exp(l - maxL));
      const sumExp = exps.reduce((a, b) => a + b, 0);
      return exps.map((e) => Number((e / sumExp).toFixed(4)));
    });
  }, [activeHead, temperature]);

  const currentTokenWeights = adjustedWeights[selectedTokenIdx];

  // SVG dimensions for Arc Visualization
  const svgWidth = 600;
  const svgHeight = 220;
  const tokenSpacing = svgWidth / TOKENS.length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Scaled Dot-Product Self-Attention &amp; Co-Reference
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Formula: <span className="font-mono text-cyan-300">Attention(Q, K, V) = softmax(Q·Kᵀ / √dₖ) · V</span>. Inspect token affinities.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1 font-mono text-xs">
          <button
            onClick={() => setViewMode("arcs")}
            className={`px-3 py-1 rounded transition ${
              viewMode === "arcs"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Token Arcs
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1 rounded transition ${
              viewMode === "matrix"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Attention Heatmap
          </button>
          <button
            onClick={() => setViewMode("qkv")}
            className={`px-3 py-1 rounded transition ${
              viewMode === "qkv"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Q·K·V Decomposition
          </button>
        </div>
      </div>

      {/* Control Bar: Head Selector & Temperature */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase">Attention Head:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveHead(1)}
              className={`px-2.5 py-1 rounded-lg border transition ${
                activeHead === 1
                  ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-bold"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Head 1: Co-Reference (it → animal)
            </button>
            <button
              onClick={() => setActiveHead(2)}
              className={`px-2.5 py-1 rounded-lg border transition ${
                activeHead === 2
                  ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-bold"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Head 2: Syntactic (cross → street)
            </button>
            <button
              onClick={() => setActiveHead(3)}
              className={`px-2.5 py-1 rounded-lg border transition ${
                activeHead === 3
                  ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-bold"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Head 3: Positional Locality
            </button>
          </div>
        </div>

        {/* Softmax Temperature Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-400">
            Softmax Temp (τ): <strong className="text-cyan-300">{temperature.toFixed(1)}</strong>
          </span>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-24 accent-cyan-400"
          />
        </div>
      </div>

      {/* Main Visualizer Views */}
      {viewMode === "arcs" && (
        <div className="space-y-4">
          {/* Interactive Token Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs">
            {TOKENS.map((token, idx) => {
              const isSelected = idx === selectedTokenIdx;
              const weight = currentTokenWeights[idx];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedTokenIdx(idx)}
                  className={`px-3 py-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/80 text-cyan-200 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105"
                      : "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{token}</span>
                  <span
                    className={`text-[10px] ${
                      weight > 0.3 ? "text-cyan-300 font-bold" : "text-zinc-500"
                    }`}
                  >
                    {(weight * 100).toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* SVG Attention Rays / Arcs */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[620px] select-none">
              {/* Token Nodes */}
              {TOKENS.map((t, idx) => {
                const x = idx * tokenSpacing + tokenSpacing / 2;
                const y = svgHeight - 35;
                const isSelected = idx === selectedTokenIdx;
                const weight = currentTokenWeights[idx];

                return (
                  <g key={`tok-node-${idx}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? "8" : "5"}
                      fill={isSelected ? "#22d3ee" : weight > 0.2 ? "#0891b2" : "#3f3f46"}
                    />
                    <text
                      x={x}
                      y={y + 20}
                      fill={isSelected ? "#22d3ee" : "#a1a1aa"}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight={isSelected ? "bold" : "normal"}
                    >
                      {t}
                    </text>
                  </g>
                );
              })}

              {/* Attention Arcs from Selected Token */}
              {TOKENS.map((_, targetIdx) => {
                const sourceX = selectedTokenIdx * tokenSpacing + tokenSpacing / 2;
                const sourceY = svgHeight - 35;
                const targetX = targetIdx * tokenSpacing + tokenSpacing / 2;
                const targetY = svgHeight - 35;
                const weight = currentTokenWeights[targetIdx];

                if (weight < 0.02) return null;

                const midX = (sourceX + targetX) / 2;
                const arcHeight = Math.abs(sourceX - targetX) * 0.45 + 20;
                const midY = Math.max(20, sourceY - arcHeight);

                return (
                  <path
                    key={`arc-${targetIdx}`}
                    d={`M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`}
                    fill="none"
                    stroke={targetIdx === selectedTokenIdx ? "#38bdf8" : "#06b6d4"}
                    strokeWidth={Math.max(1, weight * 8)}
                    strokeOpacity={Math.max(0.15, weight * 1.2)}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* View 2: Full N x N Attention Heatmap Matrix */}
      {viewMode === "matrix" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs flex flex-col items-center">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">
            Full 10×10 Attention Weight Matrix (Query Rows × Key Columns)
          </span>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-11 gap-1">
              {/* Header Corner */}
              <div className="w-11 h-8 text-[9px] text-zinc-500 flex items-center justify-center">
                Q \ K
              </div>
              {/* Column Headers (Keys) */}
              {TOKENS.map((t, idx) => (
                <div
                  key={`col-head-${idx}`}
                  className="w-11 h-8 text-[9px] text-zinc-400 font-bold flex items-center justify-center truncate"
                  title={t}
                >
                  {t.slice(0, 4)}
                </div>
              ))}

              {/* Rows (Queries) */}
              {TOKENS.map((qTok, rIdx) => (
                <React.Fragment key={`row-wrap-${rIdx}`}>
                  <div className="w-11 h-8 text-[9px] text-zinc-400 font-bold flex items-center justify-end pr-1 truncate">
                    {qTok.slice(0, 4)}
                  </div>
                  {adjustedWeights[rIdx].map((w, cIdx) => (
                    <div
                      key={`cell-${rIdx}-${cIdx}`}
                      onClick={() => {
                        setSelectedTokenIdx(rIdx);
                        setViewMode("arcs");
                      }}
                      className="w-11 h-8 rounded text-[9px] flex items-center justify-center cursor-pointer transition-all hover:ring-1 hover:ring-cyan-400"
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${Math.max(0.04, w)})`,
                        color: w > 0.25 ? "#ecfeff" : "#71717a",
                        fontWeight: w > 0.25 ? "bold" : "normal",
                      }}
                      title={`Query "${qTok}" attends to Key "${TOKENS[cIdx]}": ${(w * 100).toFixed(1)}%`}
                    >
                      {(w * 100).toFixed(0)}%
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 3: Query, Key, Value Progressive Breakdown */}
      {viewMode === "qkv" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-xs space-y-4">
          <h4 className="font-bold text-cyan-300 uppercase text-xs">
            The Three Projection Projections: Query, Key, Value
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
              <span className="text-cyan-400 font-bold block">1. Query (Q)</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                &quot;What am I looking for?&quot; Projected vector representing the current token seeking context (e.g. &quot;it&quot; is an empty pronoun looking for its referent).
              </p>
            </div>

            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
              <span className="text-cyan-400 font-bold block">2. Key (K)</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                &quot;What information do I offer?&quot; Projected vector representing labels each token advertises (e.g. &quot;animal&quot; advertises animate noun).
              </p>
            </div>

            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
              <span className="text-cyan-400 font-bold block">3. Value (V)</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                &quot;What content gets mixed in?&quot; The actual semantic representation retrieved and blended when Q and K produce a high dot product score.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-300 leading-relaxed">
            <strong className="text-white">Why scale by √dₖ?</strong> As embedding dimension <code className="text-cyan-300">dₖ</code> grows, the dot product <code className="text-cyan-300">Q·Kᵀ</code> grows large in magnitude. Large inputs push the softmax function into regions with near-zero gradients (vanishing gradient trap). Scaling by <code className="text-cyan-300">1/√dₖ</code> preserves unit variance.
          </div>
        </div>
      )}
    </div>
  );
}
