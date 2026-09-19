"use client";

import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, RotateCcw, Grid, Eye, Check } from "lucide-react";

type KernelPreset = "sobel-v" | "sobel-h" | "blur" | "sharpen" | "ridge";

const KERNEL_PRESETS: Record<KernelPreset, { name: string; weights: number[][]; bias: number }> = {
  "sobel-v": {
    name: "Sobel Vertical Edge",
    weights: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    bias: 0,
  },
  "sobel-h": {
    name: "Sobel Horizontal Edge",
    weights: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    bias: 0,
  },
  blur: {
    name: "Gaussian / Box Blur",
    weights: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
    bias: 0,
  },
  sharpen: {
    name: "Sharpen",
    weights: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    bias: 0,
  },
  ridge: {
    name: "Ridge / Outline Detection",
    weights: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    bias: 0,
  },
};

// 6x6 Synthetic Grayscale Image (featuring a sharp vertical edge down the middle)
const DEFAULT_IMAGE: number[][] = [
  [10, 10, 10, 240, 240, 240],
  [10, 10, 10, 240, 240, 240],
  [10, 10, 10, 240, 240, 240],
  [10, 10, 10, 240, 240, 240],
  [10, 10, 10, 240, 240, 240],
  [10, 10, 10, 240, 240, 240],
];

export function CnnConvolutionViz() {
  const [image] = useState<number[][]>(DEFAULT_IMAGE);
  const [selectedPreset, setSelectedPreset] = useState<KernelPreset>("sobel-v");
  const [kernel, setKernel] = useState<number[][]>(KERNEL_PRESETS["sobel-v"].weights);
  const [bias, setBias] = useState<number>(0);

  // Position of 3x3 kernel on 6x6 image (row in [0, 3], col in [0, 3] => 4x4 feature map)
  const [kernelPos, setKernelPos] = useState<{ r: number; c: number }>({ r: 0, c: 1 });
  const [showPooling, setShowPooling] = useState<boolean>(true);

  // Feature map dimensions (6 - 3 + 1 = 4x4)
  const featureMap = useMemo(() => {
    const map: number[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let kr = 0; kr < 3; kr++) {
          for (let kc = 0; kc < 3; kc++) {
            sum += image[r + kr][c + kc] * kernel[kr][kc];
          }
        }
        row.push(Number((sum + bias).toFixed(1)));
      }
      map.push(row);
    }
    return map;
  }, [image, kernel, bias]);

  // 2x2 Max Pooling of 4x4 Feature Map => 2x2 pooled output
  const pooledMap = useMemo(() => {
    const pooled: number[][] = [];
    for (let pr = 0; pr < 2; pr++) {
      const row: number[] = [];
      for (let pc = 0; pc < 2; pc++) {
        const r0 = pr * 2;
        const c0 = pc * 2;
        const maxVal = Math.max(
          featureMap[r0][c0],
          featureMap[r0][c0 + 1],
          featureMap[r0 + 1][c0],
          featureMap[r0 + 1][c0 + 1]
        );
        row.push(maxVal);
      }
      pooled.push(row);
    }
    return pooled;
  }, [featureMap]);

  // Step calculations at current position
  const currentCalculations = useMemo(() => {
    const items: { px: number; kw: number; prod: number }[] = [];
    let total = 0;
    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        const px = image[kernelPos.r + kr][kernelPos.c + kc];
        const kw = kernel[kr][kc];
        const prod = px * kw;
        total += prod;
        items.push({ px, kw, prod });
      }
    }
    return { items, total, finalVal: total + bias };
  }, [image, kernelPos, kernel, bias]);

  const handlePresetSelect = (preset: KernelPreset) => {
    setSelectedPreset(preset);
    setKernel(KERNEL_PRESETS[preset].weights);
    setBias(KERNEL_PRESETS[preset].bias);
  };

  const handleNextKernelStep = () => {
    setKernelPos((prev) => {
      let nextC = prev.c + 1;
      let nextR = prev.r;
      if (nextC > 3) {
        nextC = 0;
        nextR = prev.r + 1;
        if (nextR > 3) nextR = 0;
      }
      return { r: nextR, c: nextC };
    });
  };

  const handlePrevKernelStep = () => {
    setKernelPos((prev) => {
      let nextC = prev.c - 1;
      let nextR = prev.r;
      if (nextC < 0) {
        nextC = 3;
        nextR = prev.r - 1;
        if (nextR < 0) nextR = 3;
      }
      return { r: nextR, c: nextC };
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-sans space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              2D Convolution Kernel Sliding &amp; Feature Extraction
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sliding 3×3 receptive field computes local dot products, translating raw pixel matrices into invariant feature maps.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={handlePrevKernelStep}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev Receptive Field</span>
          </button>

          <button
            onClick={handleNextKernelStep}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 transition"
          >
            <span>Next Receptive Field</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setKernelPos({ r: 0, c: 0 })}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset Position"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Filters */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-zinc-500 text-[10px] uppercase">Kernel Filter:</span>
        {(Object.keys(KERNEL_PRESETS) as KernelPreset[]).map((pKey) => (
          <button
            key={pKey}
            onClick={() => handlePresetSelect(pKey)}
            className={`px-2.5 py-1 rounded-lg border transition ${
              selectedPreset === pKey
                ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {KERNEL_PRESETS[pKey].name}
          </button>
        ))}
      </div>

      {/* Main Inspection Area: Image -> Kernel -> Feature Map -> Pooling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: 6x6 Image with Receptive Field Highlight */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col items-center space-y-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            1. Input Image (6×6 Grayscale)
          </span>

          <div className="grid grid-cols-6 gap-1 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
            {image.map((row, r) =>
              row.map((val, c) => {
                const isUnderKernel =
                  r >= kernelPos.r &&
                  r < kernelPos.r + 3 &&
                  c >= kernelPos.c &&
                  c < kernelPos.c + 3;

                return (
                  <div
                    key={`img-${r}-${c}`}
                    className={`w-9 h-9 rounded flex items-center justify-center font-mono text-[10px] transition-all cursor-pointer ${
                      isUnderKernel
                        ? "border-2 border-cyan-400 font-bold text-cyan-200 bg-cyan-950/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        : "border border-zinc-800/80 text-zinc-400 bg-zinc-900/80"
                    }`}
                    style={{
                      backgroundColor: isUnderKernel
                        ? undefined
                        : `rgb(${Math.floor(val * 0.25)}, ${Math.floor(val * 0.25)}, ${Math.floor(val * 0.25)})`,
                    }}
                    onClick={() => {
                      const newR = Math.max(0, Math.min(3, r - 1));
                      const newC = Math.max(0, Math.min(3, c - 1));
                      setKernelPos({ r: newR, c: newC });
                    }}
                  >
                    {val}
                  </div>
                );
              })
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Receptive Field: [{kernelPos.r}:{kernelPos.r + 2}, {kernelPos.c}:{kernelPos.c + 2}]
          </span>
        </div>

        {/* Center: Arithmetic Breakdown */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-cyan-400 font-bold uppercase text-[11px]">
              2. Kernel Dot Product
            </span>
            <span className="text-[10px] text-zinc-500">3×3 Convolution</span>
          </div>

          <div className="text-[11px] text-zinc-300 leading-relaxed max-h-[140px] overflow-y-auto space-y-1 pr-1">
            {currentCalculations.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-zinc-400">
                <span>
                  p[{idx}]: {item.px} × {item.kw.toFixed(2)}
                </span>
                <span className="text-zinc-200 font-bold">{item.prod.toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Sum + Bias:</span>
            <span className="text-base font-bold text-cyan-300">
              {currentCalculations.finalVal.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Right: Feature Map & Pooling */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col items-center space-y-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            3. Feature Map (4×4)
          </span>

          <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
            {featureMap.map((row, r) =>
              row.map((val, c) => {
                const isActive = r === kernelPos.r && c === kernelPos.c;
                return (
                  <div
                    key={`fm-${r}-${c}`}
                    onClick={() => setKernelPos({ r, c })}
                    className={`w-11 h-11 rounded flex flex-col items-center justify-center font-mono cursor-pointer transition-all ${
                      isActive
                        ? "border-2 border-cyan-400 bg-cyan-950/70 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        : "border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-[10px]">{val.toFixed(0)}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Max Pooling Row */}
          {showPooling && (
            <div className="w-full pt-2 border-t border-zinc-800/80 flex flex-col items-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                4. Max Pooling 2×2 (Downsample to 2×2)
              </span>
              <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                {pooledMap.map((pRow, pr) =>
                  pRow.map((pVal, pc) => (
                    <div
                      key={`pm-${pr}-${pc}`}
                      className="w-12 h-9 rounded border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center"
                    >
                      {pVal.toFixed(0)}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
