"use client";

import React, { useState } from "react";
import { Check, Copy, Download, Terminal, FileCode2, Shield, Clock, Cpu } from "lucide-react";
import { Language } from "@/content/concepts/types";

interface HighlightedCodeData {
  lang: Language;
  filename: string;
  rawCode: string;
  html: string;
  explanation: string;
  keyDecisions: string[];
  complexityNotes: string;
}

interface CodeViewerProps {
  implementations: Record<Language, HighlightedCodeData>;
}

export function CodeViewer({ implementations }: CodeViewerProps) {
  const [selectedLang, setSelectedLang] = useState<Language>("go");
  const [copied, setCopied] = useState<boolean>(false);

  const current = implementations[selectedLang];

  const handleCopy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!current) return;
    const blob = new Blob([current.rawCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = current.filename || `implementation.${selectedLang}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineCount = current?.rawCode ? current.rawCode.split("\n").length : 0;

  const languages: { id: Language; label: string; badge: string }[] = [
    { id: "go", label: "Go", badge: ".go" },
    { id: "typescript", label: "TypeScript", badge: ".ts" },
    { id: "python", label: "Python", badge: ".py" },
    { id: "java", label: "Java", badge: ".java" },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Design Decisions Section Above the Code */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Cpu className="h-4 w-4" /> Core Architectural Design Decisions
          </h4>
          <span className="font-mono text-[10px] text-zinc-500">Invariants & Concurrency</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-zinc-400 font-bold block">Why Mutex / Locks?</span>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Token refill and decrement must be strictly atomic. Mutex guarantees no two concurrent threads double-spend the final token.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-zinc-400 font-bold block">Why Monotonic Clock?</span>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Wall clock time (<code className="text-cyan-300">time.Now()</code>) can jump backwards during NTP syncs, creating negative time intervals. Monotonic clock strictly moves forward.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-zinc-400 font-bold block">Why Lazy Refill?</span>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Background ticker timers waste CPU cycles for idle keys. Calculating <code className="text-cyan-300">elapsed × rate</code> on-demand runs in O(1) only when requests arrive.
            </p>
          </div>
        </div>

        {/* Complexity Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-800/60 font-mono text-[11px]">
          <span className="text-zinc-400">Algorithmic Complexity:</span>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-emerald-400 font-bold">
            Time: O(1) per request check
          </span>
          <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-cyan-400 font-bold">
            Space: O(1) per client key (~16 bytes)
          </span>
        </div>
      </div>

      {/* Code Container with Sticky Language Tabs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        {/* Sticky Header Bar */}
        <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-2.5 gap-3">
          {/* Language Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {languages.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLang(l.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedLang === l.id
                    ? "bg-zinc-800 text-white font-medium shadow-sm border border-cyan-500/40 active-cyan-glow"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <span className="text-[10px] text-zinc-500">{l.badge}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          {/* Action Controls: Filename, Line Count, Copy, Download */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
              <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />
              <span>{current?.filename}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{lineCount} LOC</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-white transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-white transition active:scale-95"
              title="Download source code"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="relative overflow-x-auto p-4 font-mono text-xs leading-relaxed max-h-[520px] overflow-y-auto">
          {current && (
            <div
              dangerouslySetInnerHTML={{ __html: current.html }}
              className="[&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!font-mono text-zinc-300"
            />
          )}
        </div>

        {/* Footer Notes */}
        {current && (
          <div className="border-t border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
            <div className="text-xs text-zinc-300 leading-relaxed max-w-[72ch]">
              <strong className="text-zinc-100 font-semibold">Implementation Strategy: </strong>
              {current.explanation}
            </div>
            {current.complexityNotes && (
              <div className="text-[11px] font-mono text-zinc-500">
                {current.complexityNotes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
