"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle } from "lucide-react";

type BreakerState = "CLOSED" | "OPEN" | "HALF-OPEN";

export function CircuitBreakerViz() {
  const failureThreshold = 3;
  const recoveryTimeoutSec = 5;

  const [state, setState] = useState<BreakerState>("CLOSED");
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [lastAction, setLastAction] = useState<string>("System initialized in CLOSED state.");
  const [trialCount, setTrialCount] = useState<number>(0);

  // Recovery timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === "OPEN" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (state === "OPEN" && countdown === 0) {
      setState("HALF-OPEN");
      setTrialCount(0);
      setLastAction("Recovery timeout elapsed -> transitioned to HALF-OPEN (Testing 1 canary request).");
    }
    return () => clearTimeout(timer);
  }, [state, countdown]);

  const sendSuccess = () => {
    if (state === "OPEN") {
      setLastAction("Blocked! Fast-failed with ErrCircuitOpen. Remote service was NOT called.");
      return;
    }

    if (state === "HALF-OPEN") {
      setState("CLOSED");
      setConsecutiveFailures(0);
      setLastAction("Canary succeeded! Remote service healthy -> Reset to CLOSED.");
      return;
    }

    // In CLOSED
    setConsecutiveFailures(0);
    setLastAction("Call succeeded (200 OK). Consecutive failures reset to 0.");
  };

  const sendFailure = () => {
    if (state === "OPEN") {
      setLastAction("Blocked! Fast-failed with ErrCircuitOpen without hitting downstream.");
      return;
    }

    if (state === "HALF-OPEN") {
      setState("OPEN");
      setCountdown(recoveryTimeoutSec);
      setLastAction("Canary call failed! Service still unhealthy -> Re-tripped to OPEN for 5s.");
      return;
    }

    // In CLOSED
    const nextFailures = consecutiveFailures + 1;
    setConsecutiveFailures(nextFailures);

    if (nextFailures >= failureThreshold) {
      setState("OPEN");
      setCountdown(recoveryTimeoutSec);
      setLastAction(`Threshold reached (${nextFailures}/${failureThreshold})! Circuit breaker TRIPPED to OPEN.`);
    } else {
      setLastAction(`Call failed (500 Error). Failures: ${nextFailures}/${failureThreshold}.`);
    }
  };

  const resetBreaker = () => {
    setState("CLOSED");
    setConsecutiveFailures(0);
    setCountdown(0);
    setTrialCount(0);
    setLastAction("Breaker manually reset to CLOSED.");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Circuit Breaker Finite State Machine
          </h3>
          <p className="text-xs text-zinc-400">
            Failure Threshold: <span className="font-mono text-zinc-200">{failureThreshold} consecutive errors</span> | Recovery Timeout:{" "}
            <span className="font-mono text-amber-400">{recoveryTimeoutSec}s</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={sendSuccess}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Send Success
          </button>
          <button
            onClick={sendFailure}
            className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition"
          >
            <XCircle className="h-3.5 w-3.5" />
            Simulate Downstream Error
          </button>
          <button
            onClick={resetBreaker}
            className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* State Diagram Nodes */}
      <div className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CLOSED */}
          <div
            className={`rounded-xl border p-4 transition-all duration-300 ${
              state === "CLOSED"
                ? "border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                : "border-zinc-800/80 bg-zinc-900/30 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400">STATE 01</span>
              {state === "CLOSED" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                  ACTIVE
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-zinc-100">CLOSED</h4>
            <p className="text-xs text-zinc-400 mt-1">Normal operation. Requests pass to downstream service.</p>
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-zinc-300 flex justify-between">
              <span>Failure Counter:</span>
              <span className={consecutiveFailures > 0 ? "text-amber-400 font-bold" : "text-zinc-400"}>
                {consecutiveFailures} / {failureThreshold}
              </span>
            </div>
          </div>

          {/* OPEN */}
          <div
            className={`rounded-xl border p-4 transition-all duration-300 ${
              state === "OPEN"
                ? "border-rose-500/60 bg-rose-950/30 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40"
                : "border-zinc-800/80 bg-zinc-900/30 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-rose-400">STATE 02</span>
              {state === "OPEN" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                  TRIPPED
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-zinc-100">OPEN</h4>
            <p className="text-xs text-zinc-400 mt-1">Fast-fails incoming calls immediately without network call.</p>
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-rose-400" /> Sleep Timer:
              </span>
              <span className="text-rose-400 font-bold">{countdown}s remaining</span>
            </div>
          </div>

          {/* HALF-OPEN */}
          <div
            className={`rounded-xl border p-4 transition-all duration-300 ${
              state === "HALF-OPEN"
                ? "border-amber-500/60 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                : "border-zinc-800/80 bg-zinc-900/30 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-amber-400">STATE 03</span>
              {state === "HALF-OPEN" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                  PROBING
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-zinc-100">HALF-OPEN</h4>
            <p className="text-xs text-zinc-400 mt-1">Allows trial canary requests. Success resets to CLOSED; failure re-opens.</p>
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-zinc-300 flex justify-between">
              <span>Canary Status:</span>
              <span className="text-amber-400 font-bold">Awaiting trial call</span>
            </div>
          </div>
        </div>

        {/* Live Status Message Box */}
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-mono text-zinc-500 mr-2">LAST EVENT:</span>
            <span className="font-medium text-zinc-200">{lastAction}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
