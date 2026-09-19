"use client";

import React, { useState } from "react";
import { RotateCcw, Activity, AlertTriangle, Layers } from "lucide-react";

type ActName = "relu" | "sigmoid" | "tanh" | "gelu" | "leaky-relu";

export function ActivationFunctionsViz() {
  const [selectedAct, setSelectedAct] = useState<ActName>("relu");
  const [inputVal, setInputVal] = useState<number>(1.5);
  const [showDerivative, setShowDerivative] = useState<boolean>(true);
  const [showNetworkCollapse, setShowNetworkCollapse] = useState<boolean>(false);

  // SVG parameters: x in [-5, 5], y in [-2, 4]
  const svgWidth = 520;
  const svgHeight = 280;
  const padX = 40;
  const padY = 30;

  const toSvgX = (x: number) => padX + ((x + 5) / 10) * (svgWidth - 2 * padX);
  const toSvgY = (y: number) => svgHeight - padY - ((y + 2) / 6) * (svgHeight - 2 * padY);

  // Math evaluations
  const evalFunc = (x: number, act: ActName): number => {
    switch (act) {
      case "relu":
        return Math.max(0, x);
      case "sigmoid":
        return 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, x))));
      case "tanh":
        return Math.tanh(x);
      case "gelu":
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
      case "leaky-relu":
        return x > 0 ? x : 0.1 * x;
    }
  };

  const evalDerivative = (x: number, act: ActName): number => {
    switch (act) {
      case "relu":
        return x > 0 ? 1 : 0;
      case "sigmoid": {
        const s = evalFunc(x, "sigmoid");
        return s * (1 - s);
      }
      case "tanh": {
        const t = Math.tanh(x);
        return 1 - t * t;
      }
      case "gelu": {
        // Numerical derivative approximation
        const eps = 0.001;
        return (evalFunc(x + eps, "gelu") - evalFunc(x - eps, "gelu")) / (2 * eps);
      }
      case "leaky-relu":
        return x > 0 ? 1 : 0.1;
    }
  };

  const currentY = evalFunc(inputVal, selectedAct);
  const currentDeriv = evalDerivative(inputVal, selectedAct);

  // Compute curve paths
  const curvePoints: [number, number][] = [];
  const derivPoints: [number, number][] = [];

  for (let x = -5.0; x <= 5.0; x += 0.1) {
    curvePoints.push([toSvgX(x), toSvgY(evalFunc(x, selectedAct))]);
    derivPoints.push([toSvgX(x), toSvgY(evalDerivative(x, selectedAct))]);
  }

  const curvePath = curvePoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`,
    ""
  );

  const derivPath = derivPoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`,
    ""
  );

  const isVanishing = (selectedAct === "sigmoid" || selectedAct === "tanh") && Math.abs(inputVal) > 3.0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Nonlinear Activation Dynamics & Derivatives
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Nonlinearity prevents deep networks from collapsing into a single linear matrix multiplication.
          </p>
        </div>

        {/* Function Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {(["relu", "sigmoid", "tanh", "gelu", "leaky-relu"] as ActName[]).map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAct(act)}
              className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition ${
                selectedAct === act
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Input Value (x)</span>
          <span className="text-base font-bold text-zinc-100">{inputVal.toFixed(2)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Activation Output f(x)</span>
          <span className="text-base font-bold text-cyan-300">{currentY.toFixed(4)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Derivative f&apos;(x) [Gradient]</span>
          <span className={`text-base font-bold ${currentDeriv < 0.05 ? "text-rose-400" : "text-emerald-400"}`}>
            {currentDeriv.toFixed(4)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Gradient Health</span>
          <span className={`text-base font-bold ${
            isVanishing ? "text-rose-400" : currentDeriv === 0 ? "text-rose-400" : "text-emerald-400"
          }`}>
            {isVanishing ? "Vanishing (Dead)" : currentDeriv === 0 ? "Zero Gradient" : "Healthy Flow"}
          </span>
        </div>
      </div>

      {/* Vanishing Gradient Warning */}
      {isVanishing && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            Vanishing gradient! At input x = {inputVal.toFixed(2)}, the derivative f&apos;(x) shrinks to {currentDeriv.toFixed(4)}. When backpropagating through multiple layers, gradients multiply by this fraction, causing weight updates to freeze.
          </span>
        </div>
      )}

      {/* SVG Canvas Plot */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex justify-center items-center overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[580px] select-none">
          {/* Axis lines */}
          <line x1={padX} y1={toSvgY(0)} x2={svgWidth - padX} y2={toSvgY(0)} stroke="#3f3f46" strokeWidth="1.2" />
          <line x1={toSvgX(0)} y1={padY} x2={toSvgX(0)} y2={svgHeight - padY} stroke="#3f3f46" strokeWidth="1.2" />

          {/* Grid lines for y = 1 and y = -1 */}
          <line x1={padX} y1={toSvgY(1)} x2={svgWidth - padX} y2={toSvgY(1)} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3,3" />
          <line x1={padX} y1={toSvgY(-1)} x2={svgWidth - padX} y2={toSvgY(-1)} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3,3" />

          {/* Axis Labels */}
          <text x={svgWidth - padX} y={toSvgY(0) + 14} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">x (Input)</text>
          <text x={toSvgX(0) + 6} y={padY + 10} fill="#71717a" fontSize="10" fontFamily="monospace">y</text>
          <text x={toSvgX(0) + 4} y={toSvgY(1) - 4} fill="#52525b" fontSize="9" fontFamily="monospace">y = 1.0</text>

          {/* Function Curve: f(x) */}
          <path d={curvePath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

          {/* Derivative Curve: f'(x) */}
          {showDerivative && (
            <path d={derivPath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="4,4" opacity="0.8" />
          )}

          {/* Current Probe Marker for f(x) */}
          <line
            x1={toSvgX(inputVal)}
            y1={toSvgY(0)}
            x2={toSvgX(inputVal)}
            y2={toSvgY(currentY)}
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <circle
            cx={toSvgX(inputVal)}
            cy={toSvgY(currentY)}
            r="6"
            fill="#22d3ee"
            stroke="#083344"
            strokeWidth="2"
            className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          />

          {/* Current Probe Marker for f'(x) */}
          {showDerivative && (
            <circle
              cx={toSvgX(inputVal)}
              cy={toSvgY(currentDeriv)}
              r="4.5"
              fill="#f59e0b"
              stroke="#451a03"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {/* Legend */}
        <div className="absolute top-4 right-4 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 font-mono text-[10px] space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-cyan-400" />
            <span className="text-zinc-300">f(x) Activation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-amber-400 border-b border-dashed border-amber-400" />
            <span className="text-zinc-300">f&apos;(x) Derivative</span>
          </div>
        </div>
      </div>

      {/* Interactive Input Probe Slider */}
      <div className="space-y-3 font-mono text-xs pt-1">
        <div className="flex justify-between text-zinc-400">
          <span>Probe Input Coordinate (x):</span>
          <span className="text-cyan-300 font-bold">{inputVal.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="-4.5"
          max="4.5"
          step="0.05"
          value={inputVal}
          onChange={(e) => setInputVal(parseFloat(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>

      {/* Network Collapse Demonstration */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-zinc-200">The Mathematical Invariant: Why Not Linear Activations?</span>
          </div>
          <button
            onClick={() => setShowNetworkCollapse(!showNetworkCollapse)}
            className="text-[11px] text-cyan-400 underline hover:text-cyan-300"
          >
            {showNetworkCollapse ? "Hide Proof" : "Show Proof"}
          </button>
        </div>

        {showNetworkCollapse && (
          <div className="border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-300 space-y-2 leading-relaxed">
            <p>
              Suppose a 3-layer network uses linear activation <code className="text-cyan-300">f(z) = z</code>:
            </p>
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-cyan-200">
              ŷ = W₃ · (W₂ · (W₁ · x)) = (W₃ · W₂ · W₁) · x = W_eff · x
            </div>
            <p>
              The composition of multiple linear transformations is mathematically identical to a single matrix multiplication <code className="text-cyan-300">W_eff</code>. No matter how deep the network is, it can only represent flat hyperplanes and fails completely on XOR or curved decision boundaries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
