"use client";

import React, { useState } from "react";
import { Check, Copy, RefreshCw, Send, AlertTriangle, ShieldCheck } from "lucide-react";

interface Transaction {
  id: string;
  key: string;
  amount: number;
  status: "COMPLETED";
  createdAt: string;
}

export function IdempotencyViz() {
  const [key, setKey] = useState<string>("idem_9f82b7c4a1");
  const [amount, setAmount] = useState<number>(250);
  const [dbRecords, setDbRecords] = useState<Transaction[]>([]);
  const [consoleLog, setConsoleLog] = useState<string>("Ready to test idempotency pipeline.");
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [isReplayed, setIsReplayed] = useState<boolean>(false);

  const generateNewKey = () => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    setKey(`idem_${randomHex}`);
    setIsReplayed(false);
  };

  const handleSend = () => {
    // Check if key already exists in DB
    const existing = dbRecords.find((r) => r.key === key);

    if (existing) {
      if (existing.amount !== amount) {
        // Payload mismatch
        setLastStatus(422);
        setIsReplayed(false);
        setConsoleLog(
          `[HTTP 422 Unprocessable Entity]: Idempotency key '${key}' reused with mismatched payload (Existing: $${existing.amount}, Attempted: $${amount}). Rejected!`
        );
        return;
      }

      // Idempotent replay!
      setLastStatus(200);
      setIsReplayed(true);
      setConsoleLog(
        `[HTTP 200 OK (CACHED REPLAY)]: Key '${key}' was already executed at ${existing.createdAt}. Bypassed business logic & DB write. Replayed cached response.`
      );
      return;
    }

    // Fresh execution
    const newTx: Transaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      key,
      amount,
      status: "COMPLETED",
      createdAt: new Date().toLocaleTimeString(),
    };

    setDbRecords((prev) => [newTx, ...prev]);
    setLastStatus(200);
    setIsReplayed(false);
    setConsoleLog(
      `[HTTP 200 OK (FRESH EXECUTION)]: Key '${key}' reserved. Charged $${amount}. Inserted transaction ${newTx.id} into ledger. Cached response envelope.`
    );
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Idempotent Gateway & Deduplication Simulator
          </h3>
          <p className="text-xs text-zinc-400">
            Guarantees <code className="font-mono text-zinc-200">f(f(x)) = f(x)</code> over flaky networks.
          </p>
        </div>

        <button
          onClick={generateNewKey}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-zinc-800 hover:text-white transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Generate New UUID Key
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
        {/* Request Builder */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block border-b border-zinc-800 pb-2">
              Outbound Client Request
            </span>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">HTTP Header: Idempotency-Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">Charge Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSend}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-medium hover:bg-emerald-500/30 transition active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                Dispatch Mutation (POST /charges)
              </button>
            </div>
          </div>

          {/* Console Log */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs font-mono space-y-1">
            <div className="text-[11px] text-zinc-500">GATEWAY RESPONSE FEEDBACK:</div>
            <div className={`leading-relaxed ${lastStatus === 422 ? "text-rose-400" : isReplayed ? "text-amber-300" : "text-emerald-400"}`}>
              {consoleLog}
            </div>
          </div>
        </div>

        {/* Persistent Ledger */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col h-[280px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Database Ledger Records ({dbRecords.length})
            </span>
            <span className="text-[10px] font-mono text-zinc-500">UNIQUE(key)</span>
          </div>

          <div className="flex-1 overflow-auto space-y-2 text-xs font-mono">
            {dbRecords.length === 0 ? (
              <div className="text-zinc-600 text-center py-12">No database records created yet.</div>
            ) : (
              dbRecords.map((r) => (
                <div key={r.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-emerald-400 font-bold">{r.id}</span>
                    <span className="text-zinc-500">{r.createdAt}</span>
                  </div>
                  <div className="text-zinc-300">
                    Amount: <strong className="text-white">${r.amount}</strong>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">Key: {r.key}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
