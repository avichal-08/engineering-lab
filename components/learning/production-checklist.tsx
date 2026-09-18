"use client";

import React, { useState } from "react";
import { CheckCircle2, Shield, Activity, Lock, Server } from "lucide-react";

interface ChecklistItem {
  metric: string;
  whyItMatters: string;
  example: string;
}

interface ChecklistCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  items: ChecklistItem[];
}

const categories: ChecklistCategory[] = [
  {
    id: "observability",
    name: "Observability & Telemetry",
    icon: Activity,
    items: [
      {
        metric: "rate_limiter_requests_total{status='allowed|rejected'}",
        whyItMatters: "Tracks total accepted vs throttled volume to calculate error budget burn rate.",
        example: "Prometheus Counter: alert when rejected / (allowed + rejected) > 0.05 for 5m.",
      },
      {
        metric: "rate_limiter_tokens_available{tier='standard|premium'}",
        whyItMatters: "Exposes real-time reservoir depth to detect systemic under-provisioning.",
        example: "Prometheus Gauge: visualize reservoir percentiles in Grafana dashboard.",
      },
      {
        metric: "rate_limiter_eval_latency_seconds",
        whyItMatters: "Ensures the limiter check itself does not introduce tail latency overhead.",
        example: "Histogram p99 latency SLA: must execute within < 1.2ms via Redis pipeline.",
      },
    ],
  },
  {
    id: "scalability",
    name: "Horizontal Scalability",
    icon: Server,
    items: [
      {
        metric: "Redis Cluster Sharding & Hash Slots",
        whyItMatters: "Distributes rate-limiting state across multiple Redis master nodes.",
        example: "Use hash tags: {user:1042}:bucket to guarantee key collocation on a single shard.",
      },
      {
        metric: "Batch Token Synchronization",
        whyItMatters: "Reduces round-trips from microservices to central Redis instances.",
        example: "Local microservice takes batch of 50 tokens at once; replenishes when reservoir drops.",
      },
    ],
  },
  {
    id: "reliability",
    name: "Fail-Open vs Fail-Closed Strategy",
    icon: Shield,
    items: [
      {
        metric: "Limiter Circuit Breaker (Fail-Open)",
        whyItMatters: "If Redis fails, decide whether to allow traffic through or block all requests.",
        example: "Production standard: Fail-open with warning alert to preserve customer checkout path.",
      },
      {
        metric: "Degraded In-Memory Fallback",
        whyItMatters: "Maintains crude node-local rate limiting if shared storage becomes unreachable.",
        example: "Switch to in-memory SyncMap with 10% global capacity if Redis ping times out.",
      },
    ],
  },
  {
    id: "security",
    name: "Security & Client Identity",
    icon: Lock,
    items: [
      {
        metric: "Tiered Key Composite (API Key + IP)",
        whyItMatters: "Prevents a malicious tenant from rotating API keys while behind a single IP.",
        example: "Redis Key: limit:{tenant_id}:{api_key_hash} with secondary fallback on Client-IP.",
      },
      {
        metric: "NAT Gateway Multi-Tenant Protection",
        whyItMatters: "Corporate offices or university campuses share one public IP address.",
        example: "Never rate limit solely on X-Forwarded-For without authenticated JWT subject ID.",
      },
    ],
  },
];

export function ProductionChecklist() {
  const [activeCategory, setActiveCategory] = useState<string>("observability");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleChecked = (metricKey: string) => {
    setCheckedItems((prev) => ({ ...prev, [metricKey]: !prev[metricKey] }));
  };

  const current = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-6 font-sans">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 pb-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                activeCategory === cat.id
                  ? "bg-zinc-800 text-white font-medium border border-cyan-500/40 active-cyan-glow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-cyan-400" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {current.items.map((item) => {
          const isChecked = !!checkedItems[item.metric];
          return (
            <div
              key={item.metric}
              onClick={() => toggleChecked(item.metric)}
              className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                isChecked
                  ? "border-emerald-500/40 bg-emerald-950/10"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <CheckCircle2
                  className={`h-4 w-4 transition-colors ${
                    isChecked ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                />
              </div>

              <div className="space-y-1 font-mono text-xs flex-1">
                <div className="font-bold text-zinc-100">{item.metric}</div>
                <p className="text-zinc-400 leading-relaxed text-[11px] max-w-[72ch]">
                  <strong className="text-zinc-300">Why it matters: </strong>
                  {item.whyItMatters}
                </p>
                <div className="rounded bg-zinc-950 px-2.5 py-1 text-[11px] text-cyan-300 border border-zinc-800/80 inline-block mt-1">
                  Example: {item.example}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
