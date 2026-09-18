"use client";

import React from "react";

interface LatencyGraphProps {
  data: number[]; // array of ms values, e.g. [5, 6, 8, 120, 240, 6]
  maxLatency?: number;
}

export function LatencyGraph({ data, maxLatency = 100 }: LatencyGraphProps) {
  const height = 64;
  const width = 240;

  if (data.length === 0) {
    return (
      <div className="h-16 w-60 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center font-mono text-[10px] text-zinc-600">
        Awaiting telemetry...
      </div>
    );
  }

  const effectiveMax = Math.max(maxLatency, ...data, 20);
  const points = data
    .map((val, idx) => {
      const x = (idx / Math.max(1, data.length - 1)) * width;
      const y = height - (Math.min(val, effectiveMax) / effectiveMax) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const latestVal = data[data.length - 1] ?? 0;

  return (
    <div className="space-y-1 font-mono">
      <div className="flex justify-between items-center text-[10px] text-zinc-400">
        <span>p99 Latency Telemetry</span>
        <span className={latestVal > 40 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
          {latestVal.toFixed(1)} ms
        </span>
      </div>

      <div className="rounded border border-zinc-800/80 bg-zinc-950 p-1.5 overflow-hidden">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Subtle Grid reference lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#27272a" strokeDasharray="2 2" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#27272a" strokeDasharray="2 2" />

          {/* Area under curve */}
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={latestVal > 40 ? "rgba(244, 63, 94, 0.15)" : "rgba(6, 182, 212, 0.15)"}
          />

          {/* Polyline */}
          <polyline
            fill="none"
            stroke={latestVal > 40 ? "#f43f5e" : "#06b6d4"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Latest point circle */}
          {data.length > 0 && (
            <circle
              cx={width}
              cy={height - (Math.min(latestVal, effectiveMax) / effectiveMax) * (height - 8) - 4}
              r="3"
              fill={latestVal > 40 ? "#f43f5e" : "#06b6d4"}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
