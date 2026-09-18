import React from "react";
import Link from "next/link";
import { Cpu, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 font-sans text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Tagline */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-white tracking-tight">Engineering Lab</span>
            </div>
            <p className="font-mono text-zinc-400 text-xs max-w-sm">
              Build systems. Break systems. Understand systems.
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm">
              An interactive technical playground teaching real-world distributed systems, resilience engineering, and backend primitives through visualizers and multi-language implementations.
            </p>
          </div>

          {/* Resilience Labs */}
          <div className="space-y-2 font-mono">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Resilience & Scale
            </span>
            <ul className="space-y-1.5 text-zinc-500">
              <li>
                <Link href="/learn/rate-limiting" className="hover:text-zinc-300 transition">
                  Rate Limiting
                </Link>
              </li>
              <li>
                <Link href="/learn/circuit-breaker" className="hover:text-zinc-300 transition">
                  Circuit Breaker
                </Link>
              </li>
              <li>
                <Link href="/learn/retries" className="hover:text-zinc-300 transition">
                  Retries & Jitter
                </Link>
              </li>
              <li>
                <Link href="/learn/idempotency" className="hover:text-zinc-300 transition">
                  Idempotency
                </Link>
              </li>
              <li>
                <Link href="/learn/caching" className="hover:text-zinc-300 transition">
                  Caching & Stampede
                </Link>
              </li>
            </ul>
          </div>

          {/* Distributed Data Labs */}
          <div className="space-y-2 font-mono">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Distributed Primitives
            </span>
            <ul className="space-y-1.5 text-zinc-500">
              <li>
                <Link href="/learn/message-queues" className="hover:text-zinc-300 transition">
                  Message Queues
                </Link>
              </li>
              <li>
                <Link href="/learn/pub-sub" className="hover:text-zinc-300 transition">
                  Publish-Subscribe
                </Link>
              </li>
              <li>
                <Link href="/learn/consistent-hashing" className="hover:text-zinc-300 transition">
                  Consistent Hashing
                </Link>
              </li>
              <li>
                <Link href="/learn/distributed-lock" className="hover:text-zinc-300 transition">
                  Distributed Lock
                </Link>
              </li>
              <li>
                <Link href="/learn/replication-quorum" className="hover:text-zinc-300 transition">
                  Replication & Quorum
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-zinc-600 text-[11px]">
          <div>Engineering Lab — Open Technical Education Platform</div>
          <div>Frontend MVP Architecture • Static Generated</div>
        </div>
      </div>
    </footer>
  );
}
