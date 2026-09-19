"use client";

import React, { useState } from "react";
import { Play, RotateCcw, AlertTriangle, Cpu, ArrowRight } from "lucide-react";

export function NeuronsViz() {
  const [x1, setX1] = useState<number>(1.2);
  const [x2, setX2] = useState<number>(-0.8);
  const [x3, setX3] = useState<number>(0.5);

  const [w1, setW1] = useState<number>(1.5);
  const [w2, setW2] = useState<number>(-2.0);
  const [w3, setW3] = useState<number>(0.8);

  const [bias, setBias] = useState<number>(-0.4);
  const [activation, setActivation] = useState<"relu" | "sigmoid" | "tanh" | "linear">("relu");
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  // Computations
  const prod1 = x1 * w1;
  const prod2 = x2 * w2;
  const prod3 = x3 * w3;
  const linearSum = prod1 + prod2 + prod3 + bias;

  const computeActivation = (z: number, act: string): number => {
    switch (act) {
      case "relu":
        return Math.max(0, z);
      case "sigmoid":
        return 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
      case "tanh":
        return Math.tanh(z);
      case "linear":
      default:
        return z;
    }
  };

  const output = computeActivation(linearSum, activation);

  const triggerPulse = () => {
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 800);
  };

  const resetValues = () => {
    setX1(1.2);
    setX2(-0.8);
    setX3(0.5);
    setW1(1.5);
    setW2(-2.0);
    setW3(0.8);
    setBias(-0.4);
    setActivation("relu");
  };

  const isDeadRelu = activation === "relu" && linearSum < 0;
  const isSaturated =
    (activation === "sigmoid" && (linearSum > 5 || linearSum < -5)) ||
    (activation === "tanh" && (linearSum > 3 || linearSum < -3));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Artificial Neuron Forward Computation Graph
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Formula: <span className="font-mono text-cyan-300">a = σ( Σ(wᵢ·xᵢ) + b )</span>. Trace intermediate values from inputs to activation.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={triggerPulse}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 transition"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Fire Neuron</span>
          </button>
          <button
            onClick={resetValues}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Weighted Sum (z)</span>
          <span className="text-base font-bold text-zinc-100">{linearSum.toFixed(3)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Activation Function</span>
          <span className="text-base font-bold text-cyan-300 uppercase">{activation}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Neuron Output (a)</span>
          <span className={`text-base font-bold ${isDeadRelu ? "text-rose-400" : "text-emerald-400"}`}>
            {output.toFixed(4)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Neuron State</span>
          <span className={`text-base font-bold ${
            isDeadRelu ? "text-rose-400" : isSaturated ? "text-amber-400" : "text-emerald-400"
          }`}>
            {isDeadRelu ? "Dead ReLU" : isSaturated ? "Saturated" : "Active"}
          </span>
        </div>
      </div>

      {/* Warnings */}
      {isDeadRelu && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            Dead Neuron! Since weighted sum z &lt; 0 ({linearSum.toFixed(2)}), ReLU clips output to 0. Gradient through this neuron is strictly zero during backpropagation.
          </span>
        </div>
      )}

      {/* Computational Graph Visualizer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-x-auto">
        <div className="min-w-[620px] flex items-center justify-between gap-3 py-4">
          {/* Column 1: Inputs */}
          <div className="flex flex-col gap-4 font-mono text-xs">
            <span className="text-[10px] text-zinc-500 uppercase text-center">Inputs (x)</span>
            {[
              { label: "x₁", val: x1, setVal: setX1 },
              { label: "x₂", val: x2, setVal: setX2 },
              { label: "x₃", val: x3, setVal: setX3 },
            ].map((inp, idx) => (
              <div key={idx} className="w-28 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-center space-y-1">
                <span className="text-cyan-400 font-bold">{inp.label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={inp.val}
                  onChange={(e) => inp.setVal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-xs text-white"
                />
              </div>
            ))}
          </div>

          {/* Column 2: Weights & Partial Products */}
          <div className="flex flex-col gap-4 font-mono text-xs">
            <span className="text-[10px] text-zinc-500 uppercase text-center">Weights (w) &amp; Products</span>
            {[
              { label: "w₁", w: w1, setW: setW1, prod: prod1 },
              { label: "w₂", w: w2, setW: setW2, prod: prod2 },
              { label: "w₃", w: w3, setW: setW3, prod: prod3 },
            ].map((weightObj, idx) => (
              <div key={idx} className="w-36 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-400">{weightObj.label}:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={weightObj.w}
                    onChange={(e) => weightObj.setW(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-right text-xs text-cyan-300"
                  />
                </div>
                <div className="text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-1 flex justify-between">
                  <span>x·w:</span>
                  <span className="text-zinc-300 font-bold">{weightObj.prod.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Flow Arrow */}
          <div className={`transition-all duration-300 ${isPulsing ? "text-cyan-400 scale-125" : "text-zinc-600"}`}>
            <ArrowRight className="h-6 w-6" />
          </div>

          {/* Column 3: Summation Node (Σ) & Bias */}
          <div className="flex flex-col items-center gap-2 font-mono text-xs">
            <span className="text-[10px] text-zinc-500 uppercase">Linear Sum</span>
            <div className={`w-32 rounded-xl border p-3 text-center space-y-2 transition-all ${
              isPulsing
                ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "border-zinc-800 bg-zinc-900/80"
            }`}>
              <div className="text-lg font-bold text-cyan-300">Σ</div>
              <div className="text-[10px] text-zinc-400">
                z = Σ(wᵢxᵢ) + b
              </div>
              <div className="text-sm font-bold text-white bg-zinc-950/80 py-1 rounded border border-zinc-800">
                {linearSum.toFixed(2)}
              </div>
              <div className="border-t border-zinc-800/80 pt-1.5 text-left">
                <span className="text-[10px] text-zinc-500 block">Bias (b):</span>
                <input
                  type="number"
                  step="0.1"
                  value={bias}
                  onChange={(e) => setBias(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-xs text-amber-300"
                />
              </div>
            </div>
          </div>

          {/* Flow Arrow */}
          <div className={`transition-all duration-300 ${isPulsing ? "text-cyan-400 scale-125" : "text-zinc-600"}`}>
            <ArrowRight className="h-6 w-6" />
          </div>

          {/* Column 4: Activation Node (σ) */}
          <div className="flex flex-col items-center gap-2 font-mono text-xs">
            <span className="text-[10px] text-zinc-500 uppercase">Activation σ(z)</span>
            <div className={`w-32 rounded-xl border p-3 text-center space-y-2 transition-all ${
              isPulsing
                ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "border-zinc-800 bg-zinc-900/80"
            }`}>
              <span className="text-xs font-bold text-emerald-400 uppercase">{activation}</span>
              <div className="text-[10px] text-zinc-400">
                {activation === "relu" ? "max(0, z)" : activation === "sigmoid" ? "1/(1+e⁻ᶻ)" : "tanh(z)"}
              </div>
              <div className={`text-base font-bold py-1 rounded border ${
                isDeadRelu
                  ? "border-rose-500/40 bg-rose-950/40 text-rose-400"
                  : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
              }`}>
                {output.toFixed(3)}
              </div>
              <select
                value={activation}
                onChange={(e) => setActivation(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-[11px] text-zinc-300"
              >
                <option value="relu">ReLU</option>
                <option value="sigmoid">Sigmoid</option>
                <option value="tanh">Tanh</option>
                <option value="linear">Linear</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Break & Experiment Scenarios */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <span className="text-zinc-500 text-[11px] uppercase">Experiment Presets:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setBias(-5.0);
              setActivation("relu");
            }}
            className="px-2.5 py-1 rounded border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 transition text-[11px]"
          >
            Induce Dead ReLU (b = -5.0)
          </button>
          <button
            onClick={() => {
              setX1(4.0);
              setW1(3.0);
              setBias(2.0);
              setActivation("sigmoid");
            }}
            className="px-2.5 py-1 rounded border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition text-[11px]"
          >
            Saturate Sigmoid (z &gt; 10)
          </button>
        </div>
      </div>
    </div>
  );
}
