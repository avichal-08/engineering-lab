"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, Sparkles } from "lucide-react";

export interface ProveItOption {
  id: string;
  label: string;
  explanation: string;
}

export interface ProveItChallengeData {
  slug: string;
  conceptTitle: string;
  scenario: {
    given: string;
    question: string;
  };
  options: ProveItOption[];
  correctOptionId: string;
  engineeringReasoning: string;
  whatHappensNext: string;
}

export const proveItChallenges: Record<string, ProveItChallengeData> = {
  "rate-limiting": {
    slug: "rate-limiting",
    conceptTitle: "Rate Limiting",
    scenario: {
      given: "Bucket Capacity = 100 tokens, Refill Rate = 20 tokens/sec. The bucket is currently full (100 tokens).",
      question: "An instantaneous flash burst of 250 requests arrives in the exact same millisecond. What happens to the traffic?",
    },
    options: [
      {
        id: "a",
        label: "All 250 requests are accepted because the system autoscales token generation.",
        explanation: "Incorrect. The token bucket enforces a hard invariant at capacity B = 100. Tokens are finite.",
      },
      {
        id: "b",
        label: "Exactly 100 requests are admitted (HTTP 200) and 150 requests are immediately rejected (HTTP 429).",
        explanation: "Correct! The bucket immediately drains 100 tokens. The remaining 150 find 0 tokens and terminate with HTTP 429 without waiting.",
      },
      {
        id: "c",
        label: "The first 100 requests pass, and the remaining 150 wait in an internal thread queue for 7.5 seconds.",
        explanation: "Incorrect for a standard Token Bucket. Leaky Bucket queues traffic; Token Bucket rejects instantly unless explicitly paired with an ingress buffer.",
      },
      {
        id: "d",
        label: "All 250 requests are rejected because the burst size exceeded the bucket capacity.",
        explanation: "Incorrect. The bucket allows requests up to available tokens rather than dropping all-or-nothing.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The Token Bucket algorithm guarantees that at any instant t, the maximum burst admitted is min(Requested, AvailableTokens). With 100 tokens available, 100 pass and 150 receive HTTP 429 with a Retry-After header calculated from (150 / 20) = 7.5 seconds.",
    whatHappensNext: "Now observe this exact scenario below in the Interactive Visualizer by clicking 'Burst (8 req)' or streaming traffic faster than the refill rate.",
  },
  "circuit-breaker": {
    slug: "circuit-breaker",
    conceptTitle: "Circuit Breaker",
    scenario: {
      given: "Failure threshold = 5 consecutive 500 errors. Sleep window = 10 seconds. State = CLOSED.",
      question: "The downstream payment provider has a network outage and fails 5 requests in a row. What happens to the 6th incoming request?",
    },
    options: [
      {
        id: "a",
        label: "The 6th request attempts downstream network I/O and times out after 30 seconds.",
        explanation: "Incorrect. That is the exact failure cascade circuit breakers exist to eliminate.",
      },
      {
        id: "b",
        label: "The breaker transitions to OPEN, and the 6th request fails fast locally in ~0.1ms with an ErrCircuitOpen error without touching the network.",
        explanation: "Correct! The breaker trips to OPEN on the 5th failure. Subsequent calls fail immediately, saving worker threads and connection pools.",
      },
      {
        id: "c",
        label: "The 6th request is buffered in an in-memory queue until the provider recovers.",
        explanation: "Incorrect. Buffering requests during an outage exhausts server memory and creates queue starvation.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "When consecutive failures reach the threshold, the circuit transitions from CLOSED to OPEN. The primary goal of OPEN state is load shedding: protect both the caller's thread pool and the downstream service by failing fast in sub-millisecond time.",
    whatHappensNext: "Try tripping the breaker in the visualizer below and notice how response latency drops from 2,000ms to 0.1ms.",
  },
  "retries": {
    slug: "retries",
    conceptTitle: "Retries & Backoff",
    scenario: {
      given: "A downstream service suffers a 2-second GC pause. 1,000 client SDKs fail simultaneously at t=0.",
      question: "If all 1,000 clients use deterministic exponential backoff (e.g., exactly 2^n seconds with no jitter), what happens at t=2.0s?",
    },
    options: [
      {
        id: "a",
        label: "Traffic smooths out automatically because the clients backed off.",
        explanation: "Incorrect. Because every client computed the exact same delay (2.0s), they all wake up at the identical microsecond.",
      },
      {
        id: "b",
        label: "A synchronized 'Thundering Herd' of all 1,000 clients hits the recovering service simultaneously, crashing it again.",
        explanation: "Correct! Without randomized jitter, backoff merely delays the collision; it synchronizes client retry phases into periodic shockwaves.",
      },
      {
        id: "c",
        label: "Only 10% of clients retry; the rest give up.",
        explanation: "Incorrect. Client retry policies retry up to max_retries regardless of other clients unless bounded by a retry budget.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Deterministic backoff preserves phase alignment across concurrent callers. Introducing Full Jitter (Sleep = random(0, 2^n)) de-correlates retry arrival across continuous time, transforming concentrated spikes into flat Poisson traffic.",
    whatHappensNext: "Compare the delay dispersion curves between Deterministic Backoff, Equal Jitter, and Full Jitter in the simulator below.",
  },
  "idempotency": {
    slug: "idempotency",
    conceptTitle: "Idempotency",
    scenario: {
      given: "Client sends POST /v1/charges with Idempotency-Key: 'pay_9988' and payload amount: $50.",
      question: "Due to a network drop, the client receives a socket timeout, but the server successfully debited the card. The client retries the exact same request 2 seconds later. What does the server do?",
    },
    options: [
      {
        id: "a",
        label: "Charges the customer a second time for $50 because it is a new HTTP request.",
        explanation: "Incorrect. That is a double charge defect.",
      },
      {
        id: "b",
        label: "Detects 'pay_9988' in the idempotency ledger, skips business execution, and returns the cached HTTP 200 response with zero duplicate charges.",
        explanation: "Correct! The idempotency key identifies this as an identical mutation. The previous result is replayed safely.",
      },
      {
        id: "c",
        label: "Returns HTTP 400 Bad Request because the key has already been consumed.",
        explanation: "Incorrect. Idempotency must return the original success response to fulfill the caller's contract safely.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Idempotency keys decouple network delivery uncertainty from business state transitions. By recording an atomic transaction record keyed by (tenant, idempotency_key), retried mutations replay the original result idempotently.",
    whatHappensNext: "Test replay detection and payload conflict validation in the Idempotency gateway below.",
  },
  "caching": {
    slug: "caching",
    conceptTitle: "Caching Strategies",
    scenario: {
      given: "A popular article key 'article:top' with 10,000 concurrent readers expires from Redis at 12:00:00 (Cache Miss).",
      question: "In a naive Cache-Aside implementation without singleflight or mutex locks, what happens to the primary PostgreSQL database?",
    },
    options: [
      {
        id: "a",
        label: "Postgres seamlessly serves all 10,000 requests from its internal query buffer in 1ms.",
        explanation: "Incorrect. 10,000 concurrent queries saturate connection pools, spike CPU, and lead to thread lock contention.",
      },
      {
        id: "b",
        label: "A 'Cache Stampede' occurs: all 10,000 reader threads observe a cache miss and simultaneously query the database for the exact same row.",
        explanation: "Correct! Without SingleFlight (coalescing) or early background refresh, cache expiration on hot keys triggers a massive database stampede.",
      },
      {
        id: "c",
        label: "Redis automatically generates the missing row on the fly.",
        explanation: "Incorrect. Redis is a key-value store and cannot synthesize missing relational database rows.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Cache stampede (or thundering herd on eviction) is the primary failure mode of uncoordinated Cache-Aside architectures. SingleFlight mutexes guarantee that only 1 thread queries the database while the remaining 9,999 wait for that single result.",
    whatHappensNext: "Observe the latency difference between cache hits (RAM ~0.6ms) vs cache misses (Database ~48ms) in the simulator below.",
  },
  "message-queues": {
    slug: "message-queues",
    conceptTitle: "Message Queues",
    scenario: {
      given: "A message causes a fatal panic / NullPointerException in Worker 1 every time it is parsed. Visibility timeout = 30s.",
      question: "Without a Dead-Letter Queue (DLQ) or max delivery attempt limit, what happens to this message?",
    },
    options: [
      {
        id: "a",
        label: "The message is automatically deleted by the queue after 1 attempt.",
        explanation: "Incorrect. Message queues guarantee at-least-once delivery; unacknowledged messages are returned to the queue.",
      },
      {
        id: "b",
        label: "It becomes a 'Poison Pill': after 30s it reappears, crashes Worker 2, reappears, crashes Worker 3, looping forever and killing all workers.",
        explanation: "Correct! Poison messages cause infinite redelivery loops that consume 100% of consumer fleet capacity until quarantined into a DLQ.",
      },
      {
        id: "c",
        label: "The queue fixes the payload formatting automatically.",
        explanation: "Incorrect. Infrastructure brokers cannot inspect or fix application deserialization bugs.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Unbounded redelivery of unprocessable messages is known as a Poison Pill defect. Robust queue architectures track `delivery_count` and quarantine messages to a Dead-Letter Queue (DLQ) once delivery_count > 3.",
    whatHappensNext: "Inject a poison pill message in the simulator below and watch the worker quarantine it into the DLQ.",
  },
  "pub-sub": {
    slug: "pub-sub",
    conceptTitle: "Publish-Subscribe",
    scenario: {
      given: "Topic 'orders.v1' has 3 consumer groups: Billing, Inventory, and Analytics. Inventory service experiences a total outage.",
      question: "What happens to the Billing and Analytics consumer groups while Inventory is down?",
    },
    options: [
      {
        id: "a",
        label: "Billing and Analytics are blocked because all subscribers must proceed in strict lockstep.",
        explanation: "Incorrect. That describes synchronous distributed transactions, not decoupled Pub/Sub.",
      },
      {
        id: "b",
        label: "Billing and Analytics continue processing events in real-time with zero disruption; only Inventory accumulates consumer lag.",
        explanation: "Correct! In Pub/Sub with independent consumer groups, each subscriber maintains its own committed offset pointer.",
      },
      {
        id: "c",
        label: "The publisher crashes because one of the subscribers failed to acknowledge the message.",
        explanation: "Incorrect. The publisher only interacts with the topic broker, not individual subscribers.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The foundational property of Pub/Sub is temporal and operational decoupling. Subscriptions maintain independent offsets. Slow or offline consumers accumulate lag in the broker without degrading real-time consumers.",
    whatHappensNext: "Simulate an outage on one subscriber in the visualizer below and verify that neighboring consumer groups remain 100% healthy.",
  },
  "consistent-hashing": {
    slug: "consistent-hashing",
    conceptTitle: "Consistent Hashing",
    scenario: {
      given: "A cluster has 3 storage nodes (A, B, C) and 1,000 keys distributed across a 360° hash ring. Node D is added to the cluster.",
      question: "Under Consistent Hashing, approximately how many keys must be migrated across the network to rebalance?",
    },
    options: [
      {
        id: "a",
        label: "All 1,000 keys must be rehashed and moved to new locations.",
        explanation: "Incorrect. Traditional modulo hashing (hash(key) % N) moves ~75% to 100% of keys, but Consistent Hashing does not.",
      },
      {
        id: "b",
        label: "Only roughly K / (N + 1) keys (approx. 250 keys, 25%) are migrated; the remaining 750 keys stay on their existing nodes.",
        explanation: "Correct! Only keys whose clockwise ownership falls into Node D's newly acquired arc migrate. The rest of the cluster is undisturbed.",
      },
      {
        id: "c",
        label: "Zero keys are moved; Node D only handles new writes.",
        explanation: "Incorrect. To maintain lookup correctness, keys belonging to Node D's coordinate space must be transferred.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "In standard hashing `hash % N`, changing N from 3 to 4 invalidates virtually every key assignment. Consistent Hashing bounds key migration to approximately K / N_new, avoiding network saturation during cluster scale-out.",
    whatHappensNext: "Add and remove Node D on the circular SVG hash ring below to verify which exact keys migrate and which stay put.",
  },
  "distributed-lock": {
    slug: "distributed-lock",
    conceptTitle: "Distributed Lock",
    scenario: {
      given: "Worker A acquires a distributed lock in Redis with a 10-second TTL. Worker A then experiences a 15-second Stop-The-World Garbage Collection (GC) pause.",
      question: "While Worker A is paused, the 10s TTL expires and Worker B acquires the lock. Worker A then wakes up from GC and attempts to write to shared storage. What happens?",
    },
    options: [
      {
        id: "a",
        label: "Worker A automatically detects it was paused and aborts its write.",
        explanation: "Incorrect. The JVM or Go runtime cannot detect its own GC pause retroactively from application code before executing the write instruction.",
      },
      {
        id: "b",
        label: "Worker A unknowingly executes the write with expired credentials, potentially overwriting Worker B's data unless monotonic fencing tokens are checked at the storage layer.",
        explanation: "Correct! (The Kleppmann Dilemma). Locks alone cannot guarantee mutual exclusion in asynchronous networks without monotonic fencing tokens.",
      },
      {
        id: "c",
        label: "Redis terminates Worker A's process remotely.",
        explanation: "Incorrect. Redis has no control over remote worker operating system processes.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Martin Kleppmann proved that in distributed systems with GC pauses or network delays, a lock can expire while a worker believes it is still valid. To protect shared storage, every lock acquisition must issue a strictly increasing Fencing Token that storage validates.",
    whatHappensNext: "Simulate a 15s GC pause in the Distributed Lock visualizer below and observe how fencing tokens reject stale writes.",
  },
  "replication-quorum": {
    slug: "replication-quorum",
    conceptTitle: "Replication & Quorum",
    scenario: {
      given: "A distributed cluster has N = 5 nodes. Write Quorum W = 3. Read Quorum R = 2.",
      question: "Does this configuration guarantee Strong Consistency (reading the most recent write)?",
    },
    options: [
      {
        id: "a",
        label: "Yes, because W is greater than half of the cluster (3 > 2.5).",
        explanation: "Incorrect. Even though writes require a majority, R=2 means the read set may not overlap with the write set.",
      },
      {
        id: "b",
        label: "No, because W + R (3 + 2 = 5) is NOT strictly greater than N (5). The read quorum can query the 2 nodes that missed the write, returning stale data.",
        explanation: "Correct! Strong consistency (Pigeonhole Principle) requires W + R > N. Here W + R = 5 = N, so zero overlap is possible.",
      },
      {
        id: "c",
        label: "Yes, because the coordinator always contacts the primary node first.",
        explanation: "Incorrect. In leaderless quorum systems (Dynamo, Cassandra), any node can be a coordinator and replicas can be stale.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The Quorum Invariant states that Strong Consistency requires W + R > N. By the Pigeonhole Principle, when W + R > N, any read quorum of size R is guaranteed to intersect with the write quorum of size W on at least one replica node holding the highest version number.",
    whatHappensNext: "Toggle W and R in the interactive Quorum matrix below to see when the consistency equation turns Strong vs Eventual.",
  },
};

interface ProveItChallengeProps {
  slug: string;
}

export function ProveItChallenge({ slug }: ProveItChallengeProps) {
  const challenge = proveItChallenges[slug];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  if (!challenge) return null;

  const isCorrect = selectedOption === challenge.correctOptionId;

  const handleSelect = (id: string) => {
    if (isRevealed) return;
    setSelectedOption(id);
  };

  const handleReveal = () => {
    if (!selectedOption) return;
    setIsRevealed(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setIsRevealed(false);
  };

  return (
    <div id="prove-it" className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 md:p-8 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              Engineering Prediction Challenge
            </div>
            <h3 className="font-serif-heading text-lg font-bold text-zinc-100">
              Prove It: Predict the System Behavior
            </h3>
          </div>
        </div>

        <span className="font-mono text-xs text-zinc-500">
          Reason before simulating
        </span>
      </div>

      {/* Scenario Given & Question */}
      <div className="space-y-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
            System State Given
          </span>
          <p className="text-zinc-200 leading-relaxed max-w-[72ch]">
            {challenge.scenario.given}
          </p>
        </div>

        <div className="p-1">
          <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold block mb-1">
            Prediction Question:
          </span>
          <p className="text-sm font-sans font-bold text-zinc-100 leading-relaxed max-w-[72ch]">
            {challenge.scenario.question}
          </p>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2.5">
        {challenge.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isThisCorrect = opt.id === challenge.correctOptionId;

          let borderClass = "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30";
          if (isSelected) {
            borderClass = "border-cyan-500/60 bg-cyan-950/20";
          }
          if (isRevealed) {
            if (isThisCorrect) {
              borderClass = "border-emerald-500/60 bg-emerald-950/20";
            } else if (isSelected && !isThisCorrect) {
              borderClass = "border-rose-500/60 bg-rose-950/20";
            } else {
              borderClass = "border-zinc-800/50 bg-zinc-900/10 opacity-60";
            }
          }

          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 ${borderClass}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-mono font-bold mt-0.5 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                      : "border-zinc-700 text-zinc-400"
                  }`}
                >
                  {opt.id.toUpperCase()}
                </span>

                <div className="space-y-1">
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed max-w-[72ch]">
                    {opt.label}
                  </p>

                  {isRevealed && (
                    <p
                      className={`text-[11px] font-mono leading-relaxed pt-1 ${
                        isThisCorrect ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {opt.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Controls & Outcome */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
        {!isRevealed ? (
          <button
            onClick={handleReveal}
            disabled={!selectedOption}
            className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-mono font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>Submit Prediction</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="w-full space-y-4">
            <div
              className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
                isCorrect
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                  : "border-rose-500/40 bg-rose-950/20 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Prediction Correct! Excellent engineering intuition.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400" />
                    <span>Prediction Incorrect — Common real-world trap.</span>
                  </>
                )}
              </div>
              <p className="text-zinc-300 leading-relaxed font-sans max-w-[72ch]">
                {challenge.engineeringReasoning}
              </p>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
              <span className="text-cyan-300">{challenge.whatHappensNext}</span>
              <button
                onClick={handleReset}
                className="text-zinc-500 hover:text-zinc-300 underline text-[11px]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
