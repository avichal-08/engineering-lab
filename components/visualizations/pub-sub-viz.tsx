"use client";

import React, { useState } from "react";
import { Radio, Send, CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";

interface SubscriberState {
  name: string;
  count: number;
  lag: number;
  paused: boolean;
}

export function PubSubViz() {
  const [eventCount, setEventCount] = useState<number>(0);
  const [subscribers, setSubscribers] = useState<SubscriberState[]>([
    { name: "Billing Service", count: 0, lag: 0, paused: false },
    { name: "Inventory Service", count: 0, lag: 0, paused: false },
    { name: "Notification / Email", count: 0, lag: 0, paused: false },
  ]);
  const [lastEvent, setLastEvent] = useState<string>("Ready to broadcast events to 'orders.v1'");

  const publishEvent = () => {
    const nextEvent = eventCount + 1;
    setEventCount(nextEvent);
    setLastEvent(`Published event #order_${nextEvent} to topic 'orders.v1'`);

    setSubscribers((prev) =>
      prev.map((sub) => {
        if (sub.paused) {
          return { ...sub, lag: sub.lag + 1 };
        }
        return { ...sub, count: sub.count + 1 };
      })
    );
  };

  const togglePause = (idx: number) => {
    setSubscribers((prev) =>
      prev.map((sub, i) => {
        if (i === idx) {
          const nextPaused = !sub.paused;
          return {
            ...sub,
            paused: nextPaused,
            // If unpausing, process lag immediately
            count: nextPaused ? sub.count : sub.count + sub.lag,
            lag: nextPaused ? sub.lag : 0,
          };
        }
        return sub;
      })
    );
  };

  const resetAll = () => {
    setEventCount(0);
    setSubscribers([
      { name: "Billing Service", count: 0, lag: 0, paused: false },
      { name: "Inventory Service", count: 0, lag: 0, paused: false },
      { name: "Notification / Email", count: 0, lag: 0, paused: false },
    ]);
    setLastEvent("Topic reset.");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Topic Broadcast & Subscriber Fan-Out Simulator
          </h3>
          <p className="text-xs text-zinc-400">
            Topic: <code className="font-mono text-cyan-300">orders.v1</code> | 1 Publisher &rarr; 3 Independent Consumer Groups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={publishEvent}
            className="flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition"
          >
            <Send className="h-3.5 w-3.5" />
            Publish OrderPlaced Event
          </button>
          <button
            onClick={resetAll}
            className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="py-6 space-y-6">
        {/* Architecture flow visual */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {/* Publisher */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 w-full md:w-auto">
            <div className="h-8 w-8 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold">
              PUB
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-zinc-200">Order Service</div>
              <div className="text-[10px] text-zinc-400 font-mono">{eventCount} events published</div>
            </div>
          </div>

          <div className="hidden md:block font-mono text-zinc-600">─────►</div>

          {/* Topic */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-cyan-500/40 w-full md:w-auto shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono font-bold text-cyan-300">Topic: orders.v1</div>
              <div className="text-[10px] text-zinc-400 font-mono">1:N Fan-Out Broker</div>
            </div>
          </div>

          <div className="hidden md:block font-mono text-zinc-600">─────►</div>

          <div className="text-xs font-mono text-zinc-400 text-center md:text-left">
            Isolated Consumer Groups
          </div>
        </div>

        {/* 3 Subscribers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscribers.map((sub, idx) => (
            <div
              key={sub.name}
              className={`rounded-xl border p-4 space-y-3 transition-all ${
                sub.paused
                  ? "border-amber-500/40 bg-amber-950/10"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-200">{sub.name}</span>
                <button
                  onClick={() => togglePause(idx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition flex items-center gap-1 ${
                    sub.paused
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {sub.paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                  {sub.paused ? "Resume" : "Simulate Outage"}
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Processed:</span>
                  <span className="text-emerald-400 font-bold">{sub.count}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Consumer Lag:</span>
                  <span className={sub.lag > 0 ? "text-amber-400 font-bold" : "text-zinc-500"}>
                    {sub.lag} events
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
                {sub.paused ? "Paused! Accumulating lag independently." : "Healthy. Reading real-time."}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs font-mono text-zinc-400">
          STATUS: <span className="text-zinc-200">{lastEvent}</span>
        </div>
      </div>
    </div>
  );
}
