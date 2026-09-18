import { Concept } from "./types";

export const retries: Concept = {
  slug: "retries",
  title: "Retry + Exponential Backoff",
  shortDescription:
    "Survive transient network anomalies by progressively backing off retry attempts with randomized jitter to prevent synchronized retry storms.",
  category: "Reliability",
  difficulty: "Beginner",
  estimatedTime: "~20 min",
  topics: [
    "Transient vs Permanent Errors",
    "Exponential Backoff",
    "Full Jitter vs Equal Jitter",
    "Retry Storms",
    "Idempotency Coupling",
    "Deadlock Prevention",
  ],

  overview: {
    problemStatement:
      "Distributed systems operate over unreliable networks where packet loss, router failover, garbage collection pauses, and temporary load spikes cause transient errors. If callers give up immediately, user operations fail needlessly. If callers retry aggressively without delay, they amplify the overload and crash recovering services in a retry storm.",
    whenToUse: [
      "Transient network connection resets (TCP RST, connection timeouts).",
      "HTTP 429 Too Many Requests or 503 Service Unavailable with Retry-After headers.",
      "Database deadlock exceptions that are safe to re-execute.",
      "Downstream microservice calls that are provably idempotent.",
    ],
    whenNotToUse: [
      "Non-idempotent write operations (e.g. POST /charges) without idempotency keys.",
      "Permanent client errors: HTTP 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found.",
      "When upstream caller has already exceeded its deadline (wasting time retrying an expired context).",
    ],
    coreInvariant:
      "Retries must only be applied to transient errors, must increase delay exponentially with decorrelated randomized jitter, and must never exceed a global maximum attempt and time ceiling.",
  },

  whyItExists: {
    realWorldProblem:
      "Consider 10,000 mobile clients whose requests fail due to a 200ms database failover. If all 10,000 clients retry immediately after 100ms, the database receives another 10,000 queries simultaneously. The database crashes again. Without randomized backoff, clients stay synchronized, pulsing massive load spikes that permanently prevent recovery.",
    catastrophicScenario:
      "A core user authentication service experiences a brief 2-second GC pause. Upstream microservices configured with naive immediate 3x retries trigger 30,000 re-executions simultaneously. The auth service wakes up from GC directly into a queue of 30,000 requests. CPU spikes to 100%, health checks fail, the load balancer removes the nodes, and all dependent internal systems fail globally.",
    systemImpact: [
      "Amplification of incoming traffic by 3x-10x during existing incidents.",
      "Harmonic synchronization of client fleets pounding struggling backends.",
      "Duplicate execution of state mutations (e.g., double billing).",
      "Exhaustion of client-side request timeout budgets.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "When an operation fails, the client inspects whether the error classification is transient (retryable). If retryable, the algorithm computes a backoff duration that grows exponentially with the attempt counter: delay = base_delay * (2 ^ attempt).",
      "Crucially, pure exponential backoff preserves phase synchronization among competing clients. To desynchronize callers, randomized 'jitter' must be introduced.",
      "Under AWS's 'Full Jitter' algorithm, the sleep duration is chosen uniformly at random between 0 and the exponential cap: sleep = random(0, min(max_delay, base_delay * 2^attempt)). This spreads out competing requests uniformly across time.",
      "The client must also enforce an absolute upper bound on both maximum backoff duration and maximum overall retry count, while respecting context deadlines.",
    ],
    singleVsDistributed:
      "A single client retrying without jitter only hurts itself. But across a distributed fleet of 100,000 clients, deterministic retries create devastating destructive interference waves that obliterate backend infrastructure.",
    semanticsAndGuarantees: [
      "At-least-once invocation: The underlying call will execute 1 to N times until success or exhaustion.",
      "Idempotency requirement: The target operation must yield identical state regardless of duplicate executions.",
      "Bounded latency: Bounded by maxAttempts * maxDelay + callTimeouts.",
    ],
    keyAlgorithms: [
      {
        name: "Full Jitter (Recommended)",
        description: "sleep = random_between(0, min(max_backoff, base * 2^attempt))",
        pros: "Provides the highest degree of desynchronization and lowest aggregate client waiting time.",
        cons: "Occasionally picks very small sleep values near 0.",
      },
      {
        name: "Equal Jitter",
        description: "half = min(max_backoff, base * 2^attempt) / 2; sleep = half + random_between(0, half)",
        pros: "Guarantees a minimum sleep threshold while still breaking synchronization.",
        cons: "Slightly higher total wait time than Full Jitter under high contention.",
      },
      {
        name: "Decorrelated Jitter",
        description: "sleep = min(max_backoff, random_between(base, previous_sleep * 3))",
        pros: "Prevents lock-step retries even when initial failures occurred simultaneously.",
        cons: "Slightly less mathematically bounded than standard exponential formulas.",
      },
    ],
  },

  visualizerType: "retry-backoff",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Classify Error Retryability",
      summary: "Inspect error status to distinguish transient blips from permanent faults.",
      explanation:
        "Define an error predicate function. Network timeouts (ECONNRESET, ETIMEDOUT), HTTP 429, 502, 503, 504 are retryable. HTTP 400, 401, 403, 404, 422 are non-retryable and must fail immediately.",
      pseudocode: `function isRetryable(err):
  if err is NetworkTimeout or err is ConnectionRefused: return true
  if err.statusCode in [429, 502, 503, 504]: return true
  return false`,
      considerations: [
        "Respect upstream Retry-After headers if provided in HTTP 429 responses.",
      ],
    },
    {
      stepNumber: 2,
      title: "Configure Bounds & Base Parameters",
      summary: "Set base delay, max delay, and max retry count.",
      explanation:
        "A typical configuration: base delay = 100ms, max delay = 3000ms, max attempts = 3. Setting max attempts too high delays user responses and locks resources.",
      considerations: [
        "Total retry duration must be less than the upstream user-facing timeout.",
      ],
    },
    {
      stepNumber: 3,
      title: "Calculate Exponential Backoff Duration",
      summary: "Scale delay exponentially: base * 2^attempt.",
      explanation:
        "For attempt 0: 100ms. Attempt 1: 200ms. Attempt 2: 400ms. Clamp the calculated value to maxDelay to prevent unbounded sleep intervals.",
      considerations: [
        "Prevent integer overflow when calculating 2^attempt for high attempt numbers.",
      ],
    },
    {
      stepNumber: 4,
      title: "Inject Randomized Full Jitter",
      summary: "Apply uniform random distribution over the interval [0, calculatedDelay].",
      explanation:
        "Multiply or pick a random floating-point value between 0.0 and 1.0 against the clamped backoff cap. This completely disperses the cluster of retrying clients.",
      pseudocode: `cap = min(maxDelay, baseDelay * (2 ^ attempt))
sleepDuration = randomUniform(0, cap)`,
      considerations: [
        "Ensure cryptographically or thread-safe pseudo-random number generator is used.",
      ],
    },
    {
      stepNumber: 5,
      title: "Respect Context Deadlines & Cancellation",
      summary: "Abort sleeping if caller context is cancelled or timed out.",
      explanation:
        "In Go, listen to ctx.Done() in a select statement alongside the timer. In TypeScript/Python, check AbortSignal or cancel tokens.",
      considerations: [
        "Do not start a retry if remaining context deadline is shorter than the backoff sleep.",
      ],
    },
    {
      stepNumber: 6,
      title: "Couple with Idempotency Tokens",
      summary: "Guarantee that duplicate executions do not create duplicate side effects.",
      explanation:
        "If retrying an HTTP mutation (POST/PUT), attach a unique Idempotency-Key header so downstream payment or database layers recognize and safely deduplicate.",
      considerations: [
        "Never retry a non-idempotent operation without an idempotency mechanism.",
      ],
    },
    {
      stepNumber: 7,
      title: "Emit Retry Telemetry",
      summary: "Track retry attempts and exhaustion rates for operational visibility.",
      explanation:
        "Record the attempt number, reason for retry, and total cumulative sleep time. High retry rates indicate impending downstream failure.",
      considerations: [
        "Alert when retry exhaustion rate exceeds 1% of total traffic.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "retry.go",
      code: `package retry

import (
	"context"
	"math"
	"math/rand"
	"time"
)

type Config struct {
	MaxAttempts int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
}

// Do executes an operation with exponential backoff and full jitter.
func Do(ctx context.Context, cfg Config, op func(ctx context.Context) error, isRetryable func(error) bool) error {
	var err error

	for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
		err = op(ctx)
		if err == nil {
			return nil
		}

		// Don't retry if non-retryable or if last attempt
		if !isRetryable(err) || attempt == cfg.MaxAttempts-1 {
			return err
		}

		// Calculate exponential cap: base * 2^attempt
		expFactor := math.Pow(2, float64(attempt))
		backoff := float64(cfg.BaseDelay) * expFactor
		if backoff > float64(cfg.MaxDelay) {
			backoff = float64(cfg.MaxDelay)
		}

		// Apply Full Jitter: uniform random duration between 0 and backoff
		sleepDuration := time.Duration(rand.Float64() * backoff)

		// Wait for sleep duration or context cancellation
		select {
		case <-time.After(sleepDuration):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return err
}`,
      explanation:
        "Production Go retry utility integrating context.Context cancellation, mathematical exponential scaling clamped to MaxDelay, and full jitter via uniform random duration.",
      keyDecisions: [
        "Integrated ctx.Done() inside select statement to abort sleeping if context deadline expires.",
        "Error predicate function separates transient network blips from permanent business logic errors.",
      ],
      complexityNotes: "Zero allocations on success path; O(1) space.",
    },

    typescript: {
      filename: "retryWithBackoff.ts",
      code: `export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable?: (error: unknown) => boolean;
  signal?: AbortSignal;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    isRetryable = () => true,
    signal,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("Operation aborted before attempt");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === maxAttempts - 1) {
        throw error;
      }

      // Calculate exponential cap: base * 2^attempt
      const expCap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));

      // Full jitter: random between 0 and expCap
      const jitterDelay = Math.random() * expCap;

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, jitterDelay);
        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("Operation aborted during retry backoff"));
            },
            { once: true }
          );
        }
      });
    }
  }

  throw lastError;
}`,
      explanation:
        "Async TypeScript implementation supporting standard AbortSignal for seamless integration with modern fetch APIs, full jitter calculations, and configurable retry predicates.",
      keyDecisions: [
        "Properly tears down setTimeout when AbortSignal triggers.",
        "Accurately handles re-throwing error on non-retryable status or attempt exhaustion.",
      ],
      complexityNotes: "Clean async promise resolution with zero memory leaks.",
    },

    python: {
      filename: "retry_backoff.py",
      code: `import time
import random
import math
from typing import Callable, TypeVar, Any, Optional

T = TypeVar("T")

def retry_with_backoff(
    func: Callable[[], T],
    max_attempts: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 3.0,
    is_retryable: Optional[Callable[[Exception], bool]] = None
) -> T:
    """Executes a callable with exponential backoff and Full Jitter."""
    last_exception = None

    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            last_exception = e
            
            if is_retryable and not is_retryable(e):
                raise e
                
            if attempt == max_attempts - 1:
                raise e

            # Compute exponential delay with ceiling
            exp_cap = min(max_delay, base_delay * (2 ** attempt))
            
            # Full Jitter: random float in [0, exp_cap]
            sleep_duration = random.uniform(0, exp_cap)
            
            time.sleep(sleep_duration)

    if last_exception:
        raise last_exception
    raise RuntimeError("Unreachable retry state")`,
      explanation:
        "Idiomatic Python implementation using random.uniform for true continuous full jitter distribution and optional exception inspection predicate.",
      keyDecisions: [
        "random.uniform provides float sleep durations down to fractional milliseconds.",
        "Guarantees that non-retryable exceptions are immediately bubbled without delay.",
      ],
      complexityNotes: "Minimal stack overhead.",
    },

    java: {
      filename: "RetryPolicy.java",
      code: `package com.engineeringlab.retry;

import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;

public class RetryPolicy {
    private final int maxAttempts;
    private final Duration baseDelay;
    private final Duration maxDelay;
    private final Predicate<Throwable> isRetryable;

    public RetryPolicy(int maxAttempts, Duration baseDelay, Duration maxDelay, Predicate<Throwable> isRetryable) {
        this.maxAttempts = maxAttempts;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.isRetryable = isRetryable;
    }

    public <T> T execute(Callable<T> task) throws Exception {
        Throwable lastError = null;

        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return task.call();
            } catch (Throwable t) {
                lastError = t;
                if (!isRetryable.test(t) || attempt == maxAttempts - 1) {
                    if (t instanceof Exception) throw (Exception) t;
                    throw new RuntimeException(t);
                }

                // Exponential backoff cap
                long maxDelayNanos = maxDelay.toNanos();
                long baseDelayNanos = baseDelay.toNanos();
                long expCapNanos = Math.min(maxDelayNanos, (long) (baseDelayNanos * Math.pow(2, attempt)));

                // Thread-safe Full Jitter
                long sleepNanos = ThreadLocalRandom.current().nextLong(0, expCapNanos + 1);

                Thread.sleep(Duration.ofNanos(sleepNanos).toMillis());
            }
        }

        if (lastError instanceof Exception) throw (Exception) lastError;
        throw new RuntimeException(lastError);
    }
}`,
      explanation:
        "High-performance Java retry executor using ThreadLocalRandom to prevent contention across multiple worker threads and nano-precision math.",
      keyDecisions: [
        "ThreadLocalRandom eliminates contention on global Random state across threads.",
        "Handles checked and unchecked Throwable cascades gracefully.",
      ],
      complexityNotes: "Thread-safe with sub-millisecond calculation overhead.",
    },
  },

  edgeCases: [
    {
      scenario: "Missing Upstream Context Deadline",
      consequence:
        "A client continues sleeping and retrying for 10 seconds even though the calling browser or ingress reverse proxy gave up after 2 seconds.",
      solution:
        "Propagate deadline/timeout budgets (e.g. gRPC deadlines or HTTP headers) and cancel retries when remaining budget < min_latency.",
    },
    {
      scenario: "Non-Idempotent Double Charging",
      consequence:
        "A payment request times out because the response was dropped on the wire, but the bank actually processed it. Retrying charges the customer twice.",
      solution:
        "Never retry mutating write calls without sending a client-generated UUID idempotency key.",
    },
    {
      scenario: "Retry Amplification in Deep Call Trees",
      consequence:
        "Service A retries 3x to B, B retries 3x to C, C retries 3x to Database. A single query produces 3^3 = 27 database requests.",
      solution:
        "Only retry at the topmost orchestrator or at the immediate caller of the failing dependency, never at every intermediate layer.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Harmonic Traffic Spikes from Missing Jitter",
        description:
          "Pure exponential backoff (e.g. 1s, 2s, 4s) causes all failed clients to retry in lockstep, repeatedly knocking over the database.",
        mitigation:
          "Mandate Full Jitter across all client SDKs and HTTP libraries.",
      },
      {
        title: "Retrying Incompatible Validation Errors",
        description:
          "Caller retries invalid JSON payload 5 times, wasting server CPU and bloating logs.",
        mitigation:
          "Enforce strict 4xx vs 5xx classification logic in retry predicates.",
      },
    ],
    scaling10x: [
      "Implement a global 'Retry Budget' (e.g., retries must not exceed 10% of total outbound requests across the fleet).",
      "Combine client-side retries with circuit breakers to fast-fail if downstream error rate exceeds 50%.",
      "Dynamically throttle retry frequency when response headers include 'Retry-After'.",
    ],
    concurrencyRaceConditions: [
      "Random seed contention: Use thread-local random generators to avoid locking on a shared math/rand state.",
    ],
    observability: {
      metrics: [
        "client_retry_attempts_total{service, method, attempt}",
        "client_retry_exhaustion_total{service, method}",
        "client_retry_sleep_seconds_sum{service}",
      ],
      logs: [
        "Warn log when attempt > 1 containing error code and sleep delay.",
      ],
      traces: [
        "Each retry iteration recorded as a child span under the parent RPC span.",
      ],
    },
    securityNotes: [
      "Do not leak sensitive payload contents or authentication tokens in retry logs.",
    ],
  },

  tradeoffs: [
    {
      approach: "Full Jitter",
      advantages: "Lowest contention, highest desynchronization, shortest average wait time.",
      disadvantages: "Occasionally executes trial calls with near-zero delay.",
      useWhen: "Default choice for cloud microservices and high-scale distributed systems.",
    },
    {
      approach: "Equal Jitter",
      advantages: "Guarantees a minimum sleep threshold while still breaking synchronization.",
      disadvantages: "Higher average latency than Full Jitter.",
      useWhen: "Downstream service requires a strict non-zero cool-down period before any re-attempt.",
    },
    {
      approach: "No Jitter (Deterministic)",
      advantages: "Predictable timing.",
      disadvantages: "Guaranteed to cause devastating retry storms under scale.",
      useWhen: "Never in distributed production systems.",
    },
  ],

  furtherReading: [
    {
      title: "Exponential Backoff And Jitter",
      type: "Blog",
      authorOrOrg: "AWS Architecture Blog (Marc Brooker)",
      description: "The definitive mathematical and operational analysis of backoff jitter algorithms.",
      url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
    },
    {
      title: "Handling Failure in Distributed Systems",
      type: "Paper",
      authorOrOrg: "Google SRE Book",
      description: "Google's production experience with retry storms, deadlines, and graceful degradation.",
      url: "https://sre.google/sre-book/addressing-cascading-failures/",
    },
  ],
};
