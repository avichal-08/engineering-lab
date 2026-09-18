"use client";

import React, { useState, useEffect } from "react";
import { Play, Plus, AlertOctagon, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";

interface Job {
  id: string;
  payload: string;
  attempts: number;
  maxAttempts: number;
  status: "QUEUED" | "PROCESSING" | "ACKED" | "DLQ";
  leasedTo?: string;
}

export function QueueViz() {
  const [queue, setQueue] = useState<Job[]>([
    { id: "job_01", payload: "Generate Thumbnail (img_942.jpg)", attempts: 0, maxAttempts: 3, status: "QUEUED" },
    { id: "job_02", payload: "Send Password Reset Email", attempts: 0, maxAttempts: 3, status: "QUEUED" },
  ]);
  const [dlq, setDlq] = useState<Job[]>([]);
  const [worker1Busy, setWorker1Busy] = useState<Job | null>(null);
  const [worker2Busy, setWorker2Busy] = useState<Job | null>(null);

  const addJob = () => {
    const newId = `job_${Math.floor(10 + Math.random() * 90)}`;
    const newJob: Job = {
      id: newId,
      payload: `Transcode Video (vid_${Math.floor(100 + Math.random() * 900)}.mp4)`,
      attempts: 0,
      maxAttempts: 3,
      status: "QUEUED",
    };
    setQueue((q) => [...q, newJob]);
  };

  const addPoisonPill = () => {
    const poison: Job = {
      id: "job_poison",
      payload: "MALFORMED_PAYLOAD_DIVIDE_BY_ZERO",
      attempts: 2, // 1 away from DLQ
      maxAttempts: 3,
      status: "QUEUED",
    };
    setQueue((q) => [poison, ...q]);
  };

  const processWithWorker1 = () => {
    if (worker1Busy || queue.length === 0) return;
    const [nextJob, ...rest] = queue;
    nextJob.attempts += 1;
    nextJob.status = "PROCESSING";
    nextJob.leasedTo = "Worker 1";
    setQueue(rest);
    setWorker1Busy(nextJob);

    setTimeout(() => {
      if (nextJob.payload.includes("MALFORMED")) {
        // Move to DLQ
        nextJob.status = "DLQ";
        setDlq((prev) => [...prev, nextJob]);
      } else {
        nextJob.status = "ACKED";
      }
      setWorker1Busy(null);
    }, 2000);
  };

  const processWithWorker2 = () => {
    if (worker2Busy || queue.length === 0) return;
    const [nextJob, ...rest] = queue;
    nextJob.attempts += 1;
    nextJob.status = "PROCESSING";
    nextJob.leasedTo = "Worker 2";
    setQueue(rest);
    setWorker2Busy(nextJob);

    setTimeout(() => {
      if (nextJob.payload.includes("MALFORMED")) {
        nextJob.status = "DLQ";
        setDlq((prev) => [...prev, nextJob]);
      } else {
        nextJob.status = "ACKED";
      }
      setWorker2Busy(null);
    }, 2500);
  };

  const resetAll = () => {
    setQueue([
      { id: "job_01", payload: "Generate Thumbnail (img_942.jpg)", attempts: 0, maxAttempts: 3, status: "QUEUED" },
      { id: "job_02", payload: "Send Password Reset Email", attempts: 0, maxAttempts: 3, status: "QUEUED" },
    ]);
    setDlq([]);
    setWorker1Busy(null);
    setWorker2Busy(null);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Producer-Consumer Queue & Dead-Letter Pipeline
          </h3>
          <p className="text-xs text-zinc-400">
            Durable FIFO buffer with visibility timeout leasing and DLQ routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addJob}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Produce Job
          </button>
          <button
            onClick={addPoisonPill}
            className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            Inject Poison Pill
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
        {/* Queue Buffer */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col h-[280px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-xs font-mono font-bold text-zinc-200">
              Primary Inbound FIFO Queue ({queue.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-400">BUFFER</span>
          </div>

          <div className="flex-1 overflow-auto space-y-2 text-xs font-mono">
            {queue.length === 0 ? (
              <div className="text-zinc-600 text-center py-16">Queue empty. Click 'Produce Job'</div>
            ) : (
              queue.map((job) => (
                <div key={job.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-cyan-400 font-bold">{job.id}</span>
                    <span className="text-zinc-500">Attempt: {job.attempts}/{job.maxAttempts}</span>
                  </div>
                  <div className="text-zinc-300 truncate">{job.payload}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Competing Consumer Workers */}
        <div className="space-y-4">
          {/* Worker 1 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-200">Worker Thread #1</span>
              <button
                onClick={processWithWorker1}
                disabled={!!worker1Busy || queue.length === 0}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-[11px] font-mono text-zinc-200 transition"
              >
                {worker1Busy ? "Processing..." : "Pull Job"}
              </button>
            </div>
            {worker1Busy ? (
              <div className="rounded bg-amber-950/20 border border-amber-500/30 p-2 text-xs font-mono text-amber-200 animate-pulse">
                Leased: {worker1Busy.id} ({worker1Busy.payload})
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-500 py-2">Idle (Awaiting task)</div>
            )}
          </div>

          {/* Worker 2 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-200">Worker Thread #2</span>
              <button
                onClick={processWithWorker2}
                disabled={!!worker2Busy || queue.length === 0}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-[11px] font-mono text-zinc-200 transition"
              >
                {worker2Busy ? "Processing..." : "Pull Job"}
              </button>
            </div>
            {worker2Busy ? (
              <div className="rounded bg-amber-950/20 border border-amber-500/30 p-2 text-xs font-mono text-amber-200 animate-pulse">
                Leased: {worker2Busy.id} ({worker2Busy.payload})
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-500 py-2">Idle (Awaiting task)</div>
            )}
          </div>
        </div>

        {/* Dead Letter Queue (DLQ) */}
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-4 flex flex-col h-[280px]">
          <div className="flex items-center justify-between border-b border-rose-900/50 pb-2 mb-3">
            <span className="text-xs font-mono font-bold text-rose-300">
              Dead-Letter Queue (DLQ) ({dlq.length})
            </span>
            <span className="text-[10px] font-mono text-rose-400">QUARANTINE</span>
          </div>

          <div className="flex-1 overflow-auto space-y-2 text-xs font-mono">
            {dlq.length === 0 ? (
              <div className="text-zinc-600 text-center py-16">No poisoned messages.</div>
            ) : (
              dlq.map((job) => (
                <div key={job.id} className="p-2.5 rounded bg-zinc-950 border border-rose-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-rose-400 font-bold">{job.id}</span>
                    <span className="text-rose-300">EXHAUSTED (3/3)</span>
                  </div>
                  <div className="text-zinc-300 truncate">{job.payload}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
