"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, ChevronRight, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";

type BackpropStep = "IDLE" | "FORWARD" | "BACKWARD" | "UPDATED";

export function BackpropagationViz() {
  // Simple 2 -> 2 -> 1 Neural Network
  // Input: [x1, x2]
  const [x1] = useState<number>(1.0);
  const [x2] = useState<number>(0.5);
  const [targetY, setTargetY] = useState<number>(1.0); // Target output

  // Weights
  // Hidden Layer: w11, w12, w21, w22, b1, b2
  const [w11, setW11] = useState<number>(0.4);
  const [w12, setW12] = useState<number>(-0.3);
  const [w21, setW21] = useState<number>(0.5);
  const [w22, setW22] = useState<number>(0.2);
  const [bh1, setBh1] = useState<number>(0.1);
  const [bh2, setBh2] = useState<number>(-0.1);

  // Output Layer: wo1, wo2, bo
  const [wo1, setWo1] = useState<number>(0.6);
  const [wo2, setWo2] = useState<number>(-0.5);
  const [bo, setBo] = useState<number>(0.2);

  const [learningRate, setLearningRate] = useState<number>(0.8);
  const [stepState, setStepState] = useState<BackpropStep>("IDLE");
  const [iterations, setIterations] = useState<number>(0);
  const [isAutoTraining, setIsAutoTraining] = useState<boolean>(false);
  const [diverged, setDiverged] = useState<boolean>(false);

  // Sigmoid and its derivative
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
  const dSigmoid = (a: number) => a * (1 - a); // d/dz = a(1-a) when a = sigmoid(z)

  // 1. Forward Pass Computations
  const zh1 = x1 * w11 + x2 * w21 + bh1;
  const ah1 = sigmoid(zh1);

  const zh2 = x1 * w12 + x2 * w22 + bh2;
  const ah2 = sigmoid(zh2);

  const zo = ah1 * wo1 + ah2 * wo2 + bo;
  const yPred = sigmoid(zo);

  // Loss: Mean Squared Error L = 0.5 * (yPred - targetY)^2
  const loss = 0.5 * Math.pow(yPred - targetY, 2);

  // 2. Backward Pass Gradients
  // Output error delta_o = dL/dzo = (yPred - targetY) * dSigmoid(yPred)
  const deltaO = (yPred - targetY) * dSigmoid(yPred);
  const gradWo1 = deltaO * ah1;
  const gradWo2 = deltaO * ah2;
  const gradBo = deltaO;

  // Hidden layer error deltas
  // delta_h1 = deltaO * wo1 * dSigmoid(ah1)
  // delta_h2 = deltaO * wo2 * dSigmoid(ah2)
  const deltaH1 = deltaO * wo1 * dSigmoid(ah1);
  const deltaH2 = deltaO * wo2 * dSigmoid(ah2);

  const gradW11 = deltaH1 * x1;
  const gradW21 = deltaH1 * x2;
  const gradW12 = deltaH2 * x1;
  const gradW22 = deltaH2 * x2;
  const gradBh1 = deltaH1;
  const gradBh2 = deltaH2;

  // Gradient magnitude (L2 norm)
  const gradNorm = Math.hypot(gradWo1, gradWo2, gradW11, gradW21, gradW12, gradW22);

  // Single step forward
  const doForward = () => {
    setStepState("FORWARD");
  };

  // Single step backward
  const doBackward = () => {
    setStepState("BACKWARD");
  };

  // Apply weight update
  const applyUpdate = useCallback(() => {
    const nextWo1 = wo1 - learningRate * gradWo1;
    const nextWo2 = wo2 - learningRate * gradWo2;
    const nextBo = bo - learningRate * gradBo;

    const nextW11 = w11 - learningRate * gradW11;
    const nextW21 = w21 - learningRate * gradW21;
    const nextW12 = w12 - learningRate * gradW12;
    const nextW22 = w22 - learningRate * gradW22;
    const nextBh1 = bh1 - learningRate * gradBh1;
    const nextBh2 = bh2 - learningRate * gradBh2;

    if (Math.abs(nextWo1) > 20 || isNaN(nextWo1)) {
      setDiverged(true);
      setIsAutoTraining(false);
      return;
    }

    setWo1(nextWo1);
    setWo2(nextWo2);
    setBo(nextBo);
    setW11(nextW11);
    setW21(nextW21);
    setW12(nextW12);
    setW22(nextW22);
    setBh1(nextBh1);
    setBh2(nextBh2);

    setIterations((it) => it + 1);
    setStepState("UPDATED");
  }, [
    wo1, wo2, bo, w11, w21, w12, w22, bh1, bh2,
    learningRate, gradWo1, gradWo2, gradBo, gradW11, gradW21, gradW12, gradW22, gradBh1, gradBh2
  ]);

  // Next step transition
  const handleNextStep = () => {
    if (stepState === "IDLE" || stepState === "UPDATED") {
      doForward();
    } else if (stepState === "FORWARD") {
      doBackward();
    } else if (stepState === "BACKWARD") {
      applyUpdate();
    }
  };

  // Auto-training loop
  useEffect(() => {
    if (isAutoTraining && !diverged) {
      const timer = setInterval(() => {
        applyUpdate();
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isAutoTraining, diverged, applyUpdate]);

  const resetNetwork = () => {
    setIsAutoTraining(false);
    setDiverged(false);
    setIterations(0);
    setStepState("IDLE");
    setW11(0.4);
    setW12(-0.3);
    setW21(0.5);
    setW22(0.2);
    setBh1(0.1);
    setBh2(-0.1);
    setWo1(0.6);
    setWo2(-0.5);
    setBo(0.2);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Backpropagation &amp; Reverse-Mode Automatic Differentiation
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Forward pass produces activations; Chain Rule flows error gradients backward to calculate <span className="font-mono text-cyan-300">∂L/∂w</span>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsAutoTraining(!isAutoTraining)}
            disabled={diverged}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isAutoTraining
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
                : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
            }`}
          >
            {isAutoTraining ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isAutoTraining ? "Pause Loop" : "Train"}</span>
          </button>

          <button
            onClick={handleNextStep}
            disabled={isAutoTraining || diverged}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition"
          >
            <span>
              {stepState === "IDLE" || stepState === "UPDATED"
                ? "1. Forward Pass"
                : stepState === "FORWARD"
                ? "2. Backward Pass"
                : "3. Apply Gradient Update"}
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={resetNetwork}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset Network"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Loss (0.5·(ŷ - y)²)</span>
          <span className={`text-base font-bold ${diverged ? "text-rose-400" : loss < 0.005 ? "text-emerald-400" : "text-cyan-300"}`}>
            {diverged ? "∞ EXPLODED" : loss.toFixed(5)}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Prediction (ŷ)</span>
          <span className="text-base font-bold text-zinc-100">{yPred.toFixed(4)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Target (y)</span>
          <span className="text-base font-bold text-emerald-400">{targetY.toFixed(1)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Gradient Norm ||∇L||</span>
          <span className="text-base font-bold text-amber-300">{gradNorm.toFixed(4)}</span>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <span className="text-[10px] text-zinc-500 uppercase block">Epoch Iterations</span>
          <span className="text-base font-bold text-zinc-300">{iterations}</span>
        </div>
      </div>

      {/* Network Interactive Visualizer Diagram */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4 overflow-x-auto">
        <div className="min-w-[640px] flex items-center justify-between gap-6 py-2">
          {/* Layer 1: Inputs */}
          <div className="flex flex-col gap-8 font-mono text-xs items-center">
            <span className="text-[10px] text-zinc-500 uppercase">Input Layer</span>
            <div className="w-16 h-16 rounded-full border border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center">
              <span className="text-cyan-400 font-bold">x₁</span>
              <span className="text-[10px] text-zinc-300">{x1.toFixed(1)}</span>
            </div>
            <div className="w-16 h-16 rounded-full border border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center">
              <span className="text-cyan-400 font-bold">x₂</span>
              <span className="text-[10px] text-zinc-300">{x2.toFixed(1)}</span>
            </div>
          </div>

          {/* Hidden Weights Interconnect */}
          <div className="flex-1 flex flex-col justify-center space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between text-zinc-400 px-2">
              <span className="text-cyan-400">w₁₁: {w11.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-rose-400 font-bold">∂L/∂w₁₁: {gradW11.toFixed(4)}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-zinc-400 px-2">
              <span className="text-cyan-400">w₂₁: {w21.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-rose-400 font-bold">∂L/∂w₂₁: {gradW21.toFixed(4)}</span>
              )}
            </div>
            <div className="flex items-center justify-center text-zinc-600 gap-2">
              {stepState === "FORWARD" ? (
                <div className="flex items-center gap-1 text-cyan-400 font-bold">
                  <span>Forward Activations Flow</span>
                  <ArrowRight className="h-4 w-4 animate-pulse" />
                </div>
              ) : stepState === "BACKWARD" ? (
                <div className="flex items-center gap-1 text-rose-400 font-bold">
                  <ArrowLeft className="h-4 w-4 animate-pulse" />
                  <span>Reverse Gradient Propagation</span>
                </div>
              ) : (
                <span>Hidden Interconnect Layer</span>
              )}
            </div>
          </div>

          {/* Layer 2: Hidden Neurons */}
          <div className="flex flex-col gap-8 font-mono text-xs items-center">
            <span className="text-[10px] text-zinc-500 uppercase">Hidden Layer (h)</span>
            <div className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center transition-all ${
              stepState === "FORWARD" ? "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "border-zinc-700 bg-zinc-900"
            }`}>
              <span className="text-zinc-200 font-bold">h₁</span>
              <span className="text-[10px] text-cyan-300">a₁: {ah1.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-[9px] text-rose-400 font-bold">δ₁: {deltaH1.toFixed(3)}</span>
              )}
            </div>
            <div className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center transition-all ${
              stepState === "FORWARD" ? "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "border-zinc-700 bg-zinc-900"
            }`}>
              <span className="text-zinc-200 font-bold">h₂</span>
              <span className="text-[10px] text-cyan-300">a₂: {ah2.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-[9px] text-rose-400 font-bold">δ₂: {deltaH2.toFixed(3)}</span>
              )}
            </div>
          </div>

          {/* Output Weights Interconnect */}
          <div className="flex-1 flex flex-col justify-center space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between text-zinc-400 px-2">
              <span className="text-cyan-400">wo₁: {wo1.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-rose-400 font-bold">∂L/∂wo₁: {gradWo1.toFixed(4)}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-zinc-400 px-2">
              <span className="text-cyan-400">wo₂: {wo2.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-rose-400 font-bold">∂L/∂wo₂: {gradWo2.toFixed(4)}</span>
              )}
            </div>
          </div>

          {/* Layer 3: Output Neuron & Loss */}
          <div className="flex flex-col gap-4 font-mono text-xs items-center">
            <span className="text-[10px] text-zinc-500 uppercase">Output (o)</span>
            <div className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center transition-all ${
              stepState === "FORWARD"
                ? "border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : stepState === "BACKWARD"
                ? "border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                : "border-zinc-700 bg-zinc-900"
            }`}>
              <span className="text-zinc-200 font-bold">ŷ</span>
              <span className="text-[10px] text-emerald-300">{yPred.toFixed(3)}</span>
              {stepState === "BACKWARD" && (
                <span className="text-[9px] text-rose-400 font-bold">δₒ: {deltaO.toFixed(3)}</span>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 text-center text-[10px]">
              <span className="text-zinc-500 block">Target y</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={targetY}
                onChange={(e) => setTargetY(parseFloat(e.target.value) || 0)}
                className="w-12 bg-zinc-950 border border-zinc-800 text-center text-emerald-400 font-bold rounded py-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Sliders & Break Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
        <div className="space-y-3 font-mono text-xs">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Learning Rate (η):</span>
              <span className={`font-bold ${learningRate > 3.0 ? "text-rose-400" : "text-cyan-300"}`}>
                {learningRate} {learningRate > 3.0 ? "(Explosion Danger)" : ""}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        {/* Break Experiments */}
        <div className="space-y-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] block uppercase tracking-wider">
            Failure Mode Experiments:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setLearningRate(4.8);
                setIsAutoTraining(true);
              }}
              className="px-2.5 py-1 rounded border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 transition text-[11px]"
            >
              Exploding Update (η = 4.8)
            </button>
            <button
              onClick={() => {
                setW11(8.0);
                setW21(8.0);
                setWo1(8.0);
              }}
              className="px-2.5 py-1 rounded border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition text-[11px]"
            >
              Vanishing Gradient (Extreme Weights)
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            The Chain Rule: <code className="text-cyan-300">∂L/∂w = (∂L/∂ŷ) · (∂ŷ/∂z) · (∂z/∂w)</code>. Each layer multiplies partial derivatives in reverse order.
          </p>
        </div>
      </div>
    </div>
  );
}
