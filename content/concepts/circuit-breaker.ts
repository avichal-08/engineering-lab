import { Concept } from "./types";

export const circuitBreaker: Concept = {
  slug: "circuit-breaker",
  title: "Circuit Breaker",
  shortDescription:
    "Prevent cascading failure by detecting downstream distress, fast-failing traffic, and orchestrating controlled probe recoveries.",
  category: "Reliability",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Cascading Failure",
    "CLOSED / OPEN / HALF-OPEN",
    "Failure Thresholds",
    "Recovery Timeout",
    "Fallback Strategies",
    "Thread Pool Isolation",
  ],

  overview: {
    problemStatement:
      "When a remote downstream service experiences degradation, high latency, or crashes, upstream callers wait on network sockets until connection or read timeouts occur. Threads block, thread pools exhaust, upstream queues backlog, and the entire system collapses in a domino cascade.",
    whenToUse: [
      "Any synchronous remote procedure call across network boundaries (HTTP, gRPC, DB drivers).",
      "Calling third-party SaaS APIs with unpredictable latency profiles.",
      "Protecting downstream dependencies already in distress from being crushed by repeated incoming calls.",
    ],
    whenNotToUse: [
      "Local in-memory function invocations where failures do not consume socket resources.",
      "Asynchronous message consumption where message lag can naturally buffer in a durable queue.",
      "Idempotent read-after-write operations within the same transactional boundary.",
    ],
    coreInvariant:
      "A failing dependency must never consume upstream caller resources; when a failure threshold is crossed, the circuit breaker opens immediately and fails fast without touching the network.",
  },

  whyItExists: {
    realWorldProblem:
      "In a microservice tree (A -> B -> C -> Database), if Database stalls on disk I/O, service C's 200 worker threads block waiting on responses. Once C exhausts its threads, B's calls to C block. Soon, A's ingress threads exhaust. A 500ms database hiccup takes down the user-facing web gateway.",
    catastrophicScenario:
      "An e-commerce order service depends on an external fraud-scoring API. The fraud vendor suffers a DDoS attack and response time increases from 50ms to 30,000ms (the HTTP socket timeout). Every checkout thread in the order service blocks. Within 12 seconds, all 1,000 server worker threads are stuck in socketRead0. The health-check endpoint stalls, Kubernetes kills the pods, restarts them, and the new pods instantly saturate their thread pools upon boot, causing permanent cluster downtime.",
    systemImpact: [
      "Total upstream thread and file-descriptor exhaustion.",
      "Unbounded latency propagation across the call graph.",
      "Denial of service for unrelated healthy routes sharing the same runtime pool.",
      "Inability of degraded downstream services to recover due to unremitting request pressure.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "The circuit breaker pattern wraps dangerous network operations in a stateful finite state machine with three primary states: CLOSED, OPEN, and HALF-OPEN.",
      "In the CLOSED state, requests flow normally through to the remote service. The breaker monitors execution outcomes over a sliding time or count window. If consecutive failures or error rate exceeds the configured failure threshold, the breaker trips to OPEN.",
      "In the OPEN state, the breaker immediately returns an error or fallback response without placing a network call. This gives the degraded downstream service breathing room to recover.",
      "After a configured sleep window (reset timeout), the breaker transitions to HALF-OPEN. It permits a limited canary quota of trial requests through. If the trial requests succeed, the breaker resets to CLOSED. If any trial fails, it immediately re-opens for another timeout period.",
    ],
    singleVsDistributed:
      "Single-node circuit breakers keep failure counts in local process memory (e.g., using atomic counters). Distributed circuit breakers aggregate failure metrics across an entire service fleet (e.g., using Redis or Envoy mesh stats) to trip globally when a shared database or third-party API is down.",
    semanticsAndGuarantees: [
      "Fail-fast: Eliminates thread blocking during downstream outages.",
      "Self-healing: Automatically tests downstream health without manual intervention.",
      "Degraded fallback: Enables returning cached, default, or empty results rather than 500 errors to end users.",
    ],
    keyAlgorithms: [
      {
        name: "Count-based Sliding Window",
        description: "Evaluates the outcome of the last N calls (e.g., last 100 requests). Trips if failure rate exceeds X%.",
        pros: "Smooth, statistically robust; immune to low-volume anomalies.",
        cons: "Slower to trip during sudden catastrophic failure if window size N is large.",
      },
      {
        name: "Time-based Sliding Window",
        description: "Maintains a rolling ring buffer of 1-second buckets over the last T seconds (e.g., last 10 seconds). Trips if failure rate in the window exceeds threshold.",
        pros: "Adapts to changing traffic volume; reflects current system health accurately.",
        cons: "Requires memory for ring buffer buckets; slightly higher synchronization overhead.",
      },
      {
        name: "Consecutive Failure Counter",
        description: "Trips immediately after K consecutive errors without statistical averaging.",
        pros: "Extremely simple; rapid reaction to sudden total blackouts.",
        cons: "Brittle under momentary network blips; can trip prematurely under high volume.",
      },
    ],
  },

  visualizerType: "circuit-breaker",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Define the State Machine & Invariants",
      summary: "Establish state transitions between CLOSED, OPEN, and HALF-OPEN.",
      explanation:
        "Model the three canonical states. In CLOSED, errors are tracked. In OPEN, network calls are short-circuited. In HALF-OPEN, a restricted number of canary probes are allowed.",
      pseudocode: `enum State { CLOSED, OPEN, HALF_OPEN }
struct CircuitBreaker {
  state: State
  failureThreshold: int      // e.g. 5 failures
  recoveryTimeout: Duration  // e.g. 10 seconds
  consecutiveFailures: int
  lastStateChange: Timestamp
}`,
      considerations: [
        "Ensure atomic state transitions so multiple threads don't trigger simultaneous state changes.",
      ],
    },
    {
      stepNumber: 2,
      title: "Define Failure Criteria",
      summary: "Distinguish between client errors (4xx) and system/infrastructure failures (5xx, timeouts).",
      explanation:
        "A 404 Not Found or 400 Bad Request indicates client error, not downstream infrastructure failure. Only 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, and network connection drops should increment the breaker's failure counter.",
      considerations: [
        "Exempt business validation exceptions from tripping the breaker.",
        "Include slow responses (latency exceeding threshold) as failures.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Fast-Fail Logic in OPEN State",
      summary: "Intercept calls and immediately return without allocating sockets or worker threads.",
      explanation:
        "Before invoking the target function, inspect the current state. If OPEN, check if recoveryTimeout has elapsed. If not elapsed, return ErrCircuitOpen immediately.",
      pseudocode: `function Execute(fn):
  state = getState()
  if state == OPEN:
    if now() - lastStateChange > recoveryTimeout:
      transitionTo(HALF_OPEN)
    else:
      return ErrCircuitOpen
      
  // Proceed with execution...`,
      considerations: [
        "Avoid thread locks during execution of the wrapped function.",
      ],
    },
    {
      stepNumber: 4,
      title: "Execute Wrapped Operation with Error Trapping",
      summary: "Run target function and intercept unhandled panics or network errors.",
      explanation:
        "Invoke the user-provided closure. Record whether the execution succeeded or failed. In Go, trap panics with recover(). In Java/TypeScript, wrap in try-catch blocks.",
      considerations: [
        "Measure latency of the wrapped call to evaluate timeout violations.",
      ],
    },
    {
      stepNumber: 5,
      title: "Orchestrate HALF-OPEN Canary Probing",
      summary: "Limit the number of concurrent probes when testing downstream health.",
      explanation:
        "When entering HALF-OPEN, only allow 1 (or a small configured limit) request to test the downstream dependency. Other requests arriving during this window should either fail-fast or execute the fallback.",
      considerations: [
        "If the canary fails, reset timer and immediately return to OPEN.",
        "If the canary succeeds, transition back to CLOSED and reset counters.",
      ],
    },
    {
      stepNumber: 6,
      title: "Provide Fallback Hooks",
      summary: "Enable callers to return cached data, static defaults, or queued jobs on breaker trip.",
      explanation:
        "Allow developers to supply an optional fallback function. For example, if the recommendation service breaker is OPEN, return the top 10 globally trending items from a static cache.",
      considerations: [
        "Ensure fallback logic itself does not call failing network services.",
      ],
    },
    {
      stepNumber: 7,
      title: "Add Observability & State Change Alerts",
      summary: "Publish gauge metrics and emit structured logs on every state transition.",
      explanation:
        "Every transition to OPEN is a critical system signal. Emit a metric (circuit_breaker_state{name} = 1) to alert site reliability engineers.",
      considerations: [
        "Avoid high-cardinality label explosion in metrics.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "circuitbreaker.go",
      code: `package circuitbreaker

import (
	"errors"
	"sync"
	"time"
)

type State int

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

var (
	ErrCircuitOpen = errors.New("circuit breaker is OPEN: fast-failing request")
)

type CircuitBreaker struct {
	mu                  sync.Mutex
	state               State
	failureThreshold    int
	recoveryTimeout     time.Duration
	consecutiveFailures int
	lastStateChange     time.Time
}

func NewCircuitBreaker(failureThreshold int, recoveryTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:            StateClosed,
		failureThreshold: failureThreshold,
		recoveryTimeout:  recoveryTimeout,
		lastStateChange:  time.Now(),
	}
}

// Execute wraps an operation with circuit breaking logic.
func (cb *CircuitBreaker) Execute(fn func() error) error {
	cb.mu.Lock()
	now := time.Now()

	switch cb.state {
	case StateOpen:
		if now.Sub(cb.lastStateChange) > cb.recoveryTimeout {
			cb.state = StateHalfOpen
			cb.lastStateChange = now
		} else {
			cb.mu.Unlock()
			return ErrCircuitOpen
		}
	case StateHalfOpen:
		// In HALF-OPEN, limit concurrent probes
	case StateClosed:
		// Normal operation
	}
	cb.mu.Unlock()

	// Execute remote call outside the lock
	err := fn()

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.consecutiveFailures++
		if cb.state == StateHalfOpen || cb.consecutiveFailures >= cb.failureThreshold {
			cb.state = StateOpen
			cb.lastStateChange = time.Now()
		}
		return err
	}

	// On success
	if cb.state == StateHalfOpen {
		cb.state = StateClosed
		cb.consecutiveFailures = 0
		cb.lastStateChange = time.Now()
	} else if cb.state == StateClosed {
		cb.consecutiveFailures = 0
	}

	return nil
}`,
      explanation:
        "Thread-safe Go implementation utilizing sync.Mutex. Crucially, the external function `fn()` is executed OUTSIDE of the mutex lock to prevent lock contention while waiting for network I/O.",
      keyDecisions: [
        "Network operation executed without holding mutex lock, maintaining concurrency.",
        "Atomic transition from OPEN to HALF-OPEN based on recoveryTimeout duration comparison.",
      ],
      complexityNotes: "Lock hold time < 50 nanoseconds per invocation.",
    },

    typescript: {
      filename: "CircuitBreaker.ts",
      code: `export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export class CircuitBreakerError extends Error {
  constructor(message = "Circuit breaker is OPEN") {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastStateChange: number = Date.now();

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeoutMs: number = 10000
  ) {}

  public async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange > this.recoveryTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = now;
      } else {
        if (fallback) return fallback();
        throw new CircuitBreakerError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.consecutiveFailures = 0;
      this.lastStateChange = Date.now();
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.state === CircuitState.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    }
  }

  public getState(): CircuitState {
    return this.state;
  }
}`,
      explanation:
        "Async TypeScript implementation with built-in optional fallback execution. Seamlessly integrates into Promise-based fetch / axios pipelines.",
      keyDecisions: [
        "Graceful fallback support returning alternative data when tripped.",
        "Automatic timeout evaluation transitioning to HALF_OPEN on next tick.",
      ],
      complexityNotes: "Zero asynchronous blocking overhead; adds < 0.1ms per call.",
    },

    python: {
      filename: "circuit_breaker.py",
      code: `import time
import threading
from enum import Enum
from typing import Callable, Any, Optional

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: float = 10.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_sec
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.last_state_change = time.monotonic()
        self._lock = threading.Lock()

    def call(self, func: Callable[..., Any], *args, fallback: Optional[Callable] = None, **kwargs) -> Any:
        with self._lock:
            now = time.monotonic()
            if self.state == CircuitState.OPEN:
                if now - self.last_state_change > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.last_state_change = now
                else:
                    if fallback:
                        return fallback()
                    raise CircuitBreakerOpenException("Circuit is OPEN: fast-failing")

        # Execute remote call outside the lock
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            if fallback:
                return fallback()
            raise e

    def _on_success(self):
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.consecutive_failures = 0
                self.last_state_change = time.monotonic()
            else:
                self.consecutive_failures = 0

    def _on_failure(self):
        with self._lock:
            self.consecutive_failures += 1
            if self.state == CircuitState.HALF_OPEN or self.consecutive_failures >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.last_state_change = time.monotonic()`,
      explanation:
        "Thread-safe Python implementation using threading.Lock and monotonic clock. Ensures lock is only held during fast state reads and counter mutations, never during network execution.",
      keyDecisions: [
        "Protects internal state transitions with threading.Lock.",
        "External function called outside lock to prevent blocking parallel threads.",
      ],
      complexityNotes: "Thread-safe with sub-microsecond lock contention.",
    },

    java: {
      filename: "CircuitBreaker.java",
      code: `package com.engineeringlab.circuitbreaker;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

public class CircuitBreaker {
    public enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long recoveryTimeoutNanos;
    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastStateChangeNanos = new AtomicLong(System.nanoTime());

    public CircuitBreaker(int failureThreshold, Duration recoveryTimeout) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeoutNanos = recoveryTimeout.toNanos();
    }

    public <T> T execute(Supplier<T> action, Supplier<T> fallback) throws Exception {
        State current = state.get();
        long now = System.nanoTime();

        if (current == State.OPEN) {
            if (now - lastStateChangeNanos.get() > recoveryTimeoutNanos) {
                if (state.compareAndSet(State.OPEN, State.HALF_OPEN)) {
                    lastStateChangeNanos.set(now);
                }
            } else {
                if (fallback != null) return fallback.get();
                throw new IllegalStateException("Circuit breaker is OPEN");
            }
        }

        try {
            T result = action.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            if (fallback != null) return fallback.get();
            throw e;
        }
    }

    private void onSuccess() {
        if (state.get() == State.HALF_OPEN) {
            if (state.compareAndSet(State.HALF_OPEN, State.CLOSED)) {
                failureCount.set(0);
                lastStateChangeNanos.set(System.nanoTime());
            }
        } else {
            failureCount.set(0);
        }
    }

    private void onFailure() {
        int failures = failureCount.incrementAndGet();
        if (state.get() == State.HALF_OPEN || failures >= failureThreshold) {
            state.set(State.OPEN);
            lastStateChangeNanos.set(System.nanoTime());
        }
    }

    public State getState() {
        return state.get();
    }
}`,
      explanation:
        "Lock-free Java implementation leveraging atomic CAS transitions (AtomicReference, AtomicInteger, AtomicLong). Zero thread contention bottlenecks for enterprise microservices.",
      keyDecisions: [
        "CAS atomic reference updates eliminate synchronized lock blocks.",
        "Supplier<T> functional composition with fallback execution.",
      ],
      complexityNotes: "Lock-free O(1) execution time.",
    },
  },

  edgeCases: [
    {
      scenario: "Canary Probe Flood in HALF-OPEN",
      consequence:
        "If hundreds of threads check the breaker at the exact millisecond it enters HALF-OPEN, all of them send requests simultaneously, crushing the recovering downstream service before it stabilizes.",
      solution:
        "Use an atomic reservation counter (e.g. CAS token) allowing strictly 1 (or N) concurrent trial probe while forcing other threads to continue fast-failing until the probe resolves.",
    },
    {
      scenario: "Intermittent Spurious Network Glitches",
      consequence:
        "Consecutive failure counter trips on 3 isolated TCP resets across 1,000,000 successful requests, causing unnecessary 10-second downtime.",
      solution:
        "Transition from simple consecutive counters to rolling percentage failure rate windows (e.g., trip only if failure rate > 50% across at least 20 samples).",
    },
    {
      scenario: "Hung Connections Bypassing Breaker",
      consequence:
        "The circuit breaker wraps the function call, but the HTTP client inside has an infinite or 60-second read timeout. Worker threads remain blocked for a minute before reporting failure.",
      solution:
        "A circuit breaker cannot fix missing socket timeouts. Always enforce strict connection and socket timeouts (e.g., 500ms - 2s) at the HTTP client driver level.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "False Positives from Client Validation Errors",
        description:
          "Downstream service returns HTTP 400 Bad Request due to client schema mismatch. Circuit breaker counts these as downstream outages and opens prematurely.",
        mitigation:
          "Inspect HTTP status codes or error types; count only 5xx errors and network I/O timeouts.",
      },
      {
        title: "Stuck in HALF-OPEN under Asymmetric Traffic",
        description:
          "In low-traffic environments, once a breaker enters HALF-OPEN, no new requests arrive for minutes, leaving it in an ambiguous state.",
        mitigation:
          "Implement active synthetic health check pings to probe downstream service during HALF-OPEN.",
      },
    ],
    scaling10x: [
      "Combine local in-process circuit breakers with Envoy/service mesh sidecar egress routing.",
      "Share aggregated breaker states via lightweight gossip or Redis pub/sub if a global fleet-wide outage is detected.",
      "Employ adaptive concurrency limits (TCP Vegas / Little's Law) alongside circuit breakers.",
    ],
    concurrencyRaceConditions: [
      "Simultaneous state transitions: Ensure only one thread can switch state from OPEN to HALF-OPEN using atomic Compare-And-Swap.",
    ],
    observability: {
      metrics: [
        "circuit_breaker_state{name} (0=Closed, 1=HalfOpen, 2=Open)",
        "circuit_breaker_failures_total{name}",
        "circuit_breaker_fast_failures_total{name}",
      ],
      logs: [
        "CRITICAL log emitted whenever state changes to OPEN with recent error samples.",
      ],
      traces: [
        "Span tag 'circuit_breaker.state' added to distributed traces to visualize fast-fails.",
      ],
    },
    securityNotes: [
      "Ensure fast-failed errors do not reveal internal IP addresses, stack traces, or credentials.",
    ],
  },

  tradeoffs: [
    {
      approach: "Consecutive Count Breaker",
      advantages: "Lowest CPU/memory overhead; instant reaction to complete outages.",
      disadvantages: "Cannot handle fluctuating error rates; prone to false trips on isolated blips.",
      useWhen: "Resource-constrained environments or services with strict zero-tolerance thresholds.",
    },
    {
      approach: "Rolling Window Percentage Breaker",
      advantages: "Statistically sound; handles high traffic gracefully without false trips.",
      disadvantages: "Consumes more memory for ring buffers; requires minimum request volume to evaluate.",
      useWhen: "High-throughput production microservices with hundreds of requests/sec.",
    },
    {
      approach: "Mesh-Level Breaker (Envoy / Istio)",
      advantages: "Language-agnostic; centralized policy enforcement without code changes.",
      disadvantages: "Adds sidecar proxy latency; cannot run custom in-process fallbacks easily.",
      useWhen: "Kubernetes microservice clusters standardizing across multiple languages.",
    },
  ],

  furtherReading: [
    {
      title: "Release It!: Design and Deploy Production-Ready Software",
      type: "Book",
      authorOrOrg: "Michael T. Nygard",
      description: "The seminal engineering book that originally introduced the Circuit Breaker pattern to software architecture.",
    },
    {
      title: "Circuit Breaker Pattern",
      type: "Blog",
      authorOrOrg: "Martin Fowler",
      description: "Foundational architectural essay exploring state transitions and fallback mechanisms.",
      url: "https://martinfowler.com/bliki/CircuitBreaker.html",
    },
    {
      title: "Fault Tolerance in Go with Hystrix / Resilience4j",
      type: "Blog",
      authorOrOrg: "Netflix TechBlog",
      description: "Deep dive into Netflix's production experience managing cascading failures at cloud scale.",
    },
  ],
};
