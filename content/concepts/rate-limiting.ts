import { Concept } from "./types";

export const rateLimiting: Concept = {
  slug: "rate-limiting",
  title: "Rate Limiting",
  shortDescription:
    "Control ingress throughput and defend upstream services against resource exhaustion, DDoS, and cascading failure.",
  category: "Distributed Systems",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Token Bucket",
    "Leaky Bucket",
    "Sliding Window Counter",
    "Distributed Redis Lua",
    "Race Conditions",
    "HTTP 429 Headers",
  ],

  overview: {
    problemStatement:
      "Modern network services operate on bounded hardware resources: socket descriptors, CPU cores, connection pools, and database IOPS. Without deterministic ingress regulation, malicious actors, misbehaving batch scripts, or sudden viral traffic bursts cause unbounded queue growth, latency spikes, and eventual cascade crashes.",
    whenToUse: [
      "Protecting public API endpoints against volumetric abuse and brute-force credential stuffing.",
      "Fair multi-tenant allocation so a single tenant cannot consume 100% of pooled worker threads.",
      "Protecting downstream third-party APIs that enforce their own hard contractual rate caps.",
      "Graceful load shedding during upstream database failover or maintenance windows.",
    ],
    whenNotToUse: [
      "As a substitute for horizontal autoscaling or computational optimization.",
      "Within trusted, synchronous low-latency microservice internal remote procedure calls (RPCs), where backpressure or circuit breaking is better suited.",
      "When strict guaranteed delivery is required—use persistent message queues with consumer throttling instead.",
    ],
    coreInvariant:
      "For any client C and sliding time window W, the number of admitted requests must never exceed threshold N, while rejected requests terminate at the perimeter with minimal compute cost.",
  },

  whyItExists: {
    realWorldProblem:
      "In unthrottled systems, request arrival follows Poisson or bursty distributions. When arrival rate λ exceeds service processing capacity μ, queue length approaches infinity (M/M/1 queuing theory: L = ρ / (1 - ρ)). Service latency degrades exponentially, timeouts trip upstream, causing automatic retries which amplify incoming load—a catastrophic retry storm.",
    catastrophicScenario:
      "A fintech payment service receives 50,000 checkout requests/sec during a flash sale. The database connection pool is sized for 500 concurrent queries. Thread pools exhaust in 180ms. Memory consumption escalates as blocked HTTP connections buffer payloads. The Linux OOM killer terminates the primary API process. Traffic fails over to replica instances, which instantly OOM in a domino cascade, leading to total global outage.",
    systemImpact: [
      "Thread pool exhaustion and socket starvation across all co-hosted services.",
      "Exponential queue latency degradation leading to client-side timeouts.",
      "Cascading retry storms that overwhelm primary database instances.",
      "Financial loss and breach of SLAs with enterprise tenants.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Rate limiting operates by evaluating an identity token (IP address, authenticated API key, or JWT tenant ID) against an arrival history or counter budget before forwarding the request to downstream business logic.",
      "If the counter budget has available capacity, the request is annotated with standard RFC 6585 rate limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) and dispatched. If exhausted, the request is immediately rejected with HTTP 429 'Too Many Requests' and a 'Retry-After' header, sparing the downstream stack from processing overhead.",
      "In a distributed architecture, state cannot be held in application memory alone because requests hit disparate nodes behind a layer-7 load balancer. Distributed rate limiters coordinate state via high-throughput in-memory stores like Redis or Hazelcast using atomic Lua scripts or CRDT counters.",
    ],
    singleVsDistributed:
      "Single-node rate limiters use local memory mutexes or atomic CAS (Compare-And-Swap) operations for zero-latency checks (~100 nanoseconds). Distributed rate limiters require an external coordination tier (e.g., Redis cluster), introducing round-trip network hops (~1-3 milliseconds) and requiring atomic scripts to avoid race conditions.",
    semanticsAndGuarantees: [
      "At-most-N enforcement: Ensures strict upper bounds on throughput.",
      "Soft vs. Hard limiting: Hard limit strictly drops excess traffic; soft limit admits excess into a delay queue or adds financial metering.",
      "Eventual consistency trade-off: Under Redis network partitions, nodes can fail-open (allow traffic to prioritize availability) or fail-closed (block traffic to protect infrastructure).",
    ],
    keyAlgorithms: [
      {
        name: "Token Bucket",
        description:
          "Tokens are replenished into a bucket of fixed capacity C at a constant rate r tokens/second. Each request consumes 1 token. Allows configurable bursts up to capacity C while guaranteeing long-term average rate r.",
        pros: "Allows controlled bursts; memory efficient (stores only timestamp and integer token count); computationally lightweight.",
        cons: "Slightly more complex state math than naive fixed windows.",
      },
      {
        name: "Leaky Bucket",
        description:
          "Incoming requests enter a FIFO queue of capacity C and leak out to the backend at a constant rate r. If the queue overflows, incoming requests are dropped.",
        pros: "Guarantees a completely smooth, deterministic downstream egress rate; prevents downstream traffic spikes.",
        cons: "Bursts are delayed rather than processed immediately; consumes buffer memory.",
      },
      {
        name: "Fixed Window Counter",
        description:
          "Divides time into fixed unit windows (e.g., 00:00-01:00). A counter tracks requests within the current interval and resets when the clock crosses the boundary.",
        pros: "Trivial to implement; O(1) storage and execution.",
        cons: "Traffic spike at window boundary can admit 2x the limit in a short window (e.g. at 00:59 and 01:00).",
      },
      {
        name: "Sliding Window Log / Counter",
        description:
          "Computes rate dynamically using a weighted sum of the previous window count and current window count based on the elapsed percentage of the current time slice.",
        pros: "Eliminates boundary burst problem; smooth rate enforcement; low memory footprint.",
        cons: "Assumes uniform distribution across the prior window, creating an approximation error of <0.05%.",
      },
    ],
  },

  visualizerType: "rate-limiter",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Define Ingress Requirements & Quotas",
      summary: "Establish client identity keys, allowable burst sizes, and sustained rate thresholds.",
      explanation:
        "Determine the granularity of limitation. Common strategies include per-IP (unauthenticated), per-user/API Key (authenticated), or global service capacity limits. For instance: 100 requests per minute with an allowable burst capacity of 10 requests.",
      pseudocode: `type RateLimitConfig struct {
  RatePerSec float64  // Token refill velocity (e.g. 50.0)
  BurstSize  int64    // Max bucket capacity (e.g. 100)
}`,
      considerations: [
        "Use authenticated user ID instead of raw IP when possible due to NAT / corporate proxies sharing single IP.",
        "Ensure burst capacity does not exceed database connection pool capacity.",
      ],
    },
    {
      stepNumber: 2,
      title: "Select Rate Limiting Algorithm",
      summary: "Evaluate trade-offs between burst tolerance, memory overhead, and computational complexity.",
      explanation:
        "For interactive APIs where momentary spikes (page loads requesting multiple assets) are legitimate, Token Bucket is the industry standard. For batch pipelines feeding sensitive databases, Leaky Bucket is optimal.",
      considerations: [
        "Token bucket requires storing only two fields per key: lastRefillTimestamp and tokensRemaining.",
        "Avoid sliding window logs for high throughput (>100k RPS) because storing every request timestamp in a Redis sorted set exhausts RAM.",
      ],
    },
    {
      stepNumber: 3,
      title: "Design State Representation & Storage Schema",
      summary: "Model the ephemeral bucket structure for low-overhead read-modify-write cycles.",
      explanation:
        "Represent the bucket with millisecond timestamps. When a request arrives at time t, calculate elapsed time since last refill, add (elapsed * refillRate) tokens up to bucket capacity, then attempt deduction.",
      pseudocode: `struct Bucket {
  tokens: float64
  lastRefillTime: int64 // unix timestamp in milliseconds
}`,
      considerations: [
        "Store timestamps in UTC milliseconds or nanoseconds to prevent drift issues.",
        "Set key TTLs (Time-To-Live) to automatically garbage-collect idle client keys.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Lazy Token Refill Logic",
      summary: "Compute token regeneration on-demand rather than running expensive background ticker threads.",
      explanation:
        "Instead of maintaining background timers that actively top up millions of idle buckets every millisecond, update token balance lazily when a request arrives: newTokens = min(capacity, currentTokens + elapsedSeconds * refillRate).",
      pseudocode: `function allowRequest(bucket, capacity, refillRate):
  now = currentTime()
  elapsed = (now - bucket.lastRefillTime) / 1000.0
  bucket.tokens = min(capacity, bucket.tokens + elapsed * refillRate)
  bucket.lastRefillTime = now
  
  if bucket.tokens >= 1.0:
    bucket.tokens -= 1.0
    return ALLOWED, bucket.tokens
  else:
    return REJECTED, 0`,
      considerations: [
        "Lazy evaluation eliminates CPU burn for inactive keys.",
        "Floating point operations must be guarded against floating point drift or precision loss.",
      ],
    },
    {
      stepNumber: 5,
      title: "Enforce Atomic Concurrency Controls",
      summary: "Guard against race conditions in multi-threaded environments.",
      explanation:
        "In concurrent environments, two simultaneous requests can read the same token count before either writes back the decremented value, allowing 2x or more traffic through. Use mutexes for in-memory or atomic Redis Lua scripts.",
      pseudocode: `// Redis Lua atomic execution
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

local elapsed = math.max(0, (now - last_refill) / 1000)
tokens = math.min(capacity, tokens + elapsed * refill_rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) * 2)
  return {1, math.floor(tokens)}
else
  return {0, math.floor(tokens)}
end`,
      considerations: [
        "Redis executes Lua scripts atomically in a single-threaded event loop.",
        "Local memory implementations should use sync.Mutex or atomic pointers.",
      ],
    },
    {
      stepNumber: 6,
      title: "Return Standardized Telemetry Headers",
      summary: "Inform upstream clients of current budget and retry timing via RFC headers.",
      explanation:
        "Clients need deterministic backoff information. Always populate RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset headers. On rejection, return HTTP status 429 Too Many Requests with Retry-After.",
      considerations: [
        "RateLimit-Reset should indicate either UTC epoch seconds or remaining seconds.",
        "Do not leak internal capacity or architectural details in error bodies.",
      ],
    },
    {
      stepNumber: 7,
      title: "Architect Distributed Fault Tolerance",
      summary: "Formulate fail-open vs fail-closed strategies during coordinator downtime.",
      explanation:
        "If your central Redis cluster times out or network partitions, does the rate limiter block all customer traffic or allow it through? Production systems typically fail-open with local degraded rate limiting fallback.",
      considerations: [
        "Implement a circuit breaker around the Redis rate limiting client with a 5ms timeout.",
        "Fall back to in-memory local limits when Redis is unreachable.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "ratelimiter.go",
      code: `package ratelimiter

import (
	"sync"
	"time"
)

// TokenBucket implements a thread-safe in-memory rate limiter.
type TokenBucket struct {
	capacity     float64
	refillRate   float64 // tokens per second
	tokens       float64
	lastRefill   time.Time
	mu           sync.Mutex
}

// NewTokenBucket creates a new bucket with specified capacity and refill rate.
func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
	return &TokenBucket{
		capacity:   capacity,
		refillRate: refillRate,
		tokens:     capacity,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request can proceed and consumes one token.
// Returns allowed boolean, remaining tokens, and retry-after duration if rejected.
func (tb *TokenBucket) Allow() (bool, float64, time.Duration) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()
	tb.lastRefill = now

	// Lazily replenish tokens based on elapsed duration
	tb.tokens = tb.tokens + (elapsed * tb.refillRate)
	if tb.tokens > tb.capacity {
		tb.tokens = tb.capacity
	}

	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true, tb.tokens, 0
	}

	// Calculate wait time until at least 1 token is available
	missing := 1.0 - tb.tokens
	retryAfter := time.Duration((missing / tb.refillRate) * float64(time.Second))
	return false, 0, retryAfter
}`,
      explanation:
        "This Go implementation utilizes a sync.Mutex to guarantee thread-safety across goroutines. It uses lazy evaluation based on monotonic time delta calculation, entirely avoiding CPU-intensive background ticker routines.",
      keyDecisions: [
        "Used sync.Mutex rather than channel communication for lower memory allocation and sub-microsecond lock contention latency.",
        "Calculated precise retry-after duration based on missing token delta divided by replenishment rate.",
      ],
      complexityNotes:
        "Time Complexity: O(1) per check. Space Complexity: O(1) per active key.",
    },

    typescript: {
      filename: "TokenBucket.ts",
      code: `export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfterMs: number;
}

export class TokenBucket {
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerSecond: number
  ) {
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  public allow(cost: number = 1): RateLimitResult {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    this.lastRefillTimestamp = now;

    // Refill tokens lazily
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillRatePerSecond
    );

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return {
        allowed: true,
        remainingTokens: Math.floor(this.tokens),
        retryAfterMs: 0,
      };
    }

    const deficit = cost - this.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillRatePerSecond) * 1000);

    return {
      allowed: false,
      remainingTokens: Math.floor(this.tokens),
      retryAfterMs,
    };
  }
}`,
      explanation:
        "TypeScript implementation running within single-threaded Node.js or Edge runtimes. Because Node.js handles synchronous operations without preemption, this synchronous method is intrinsically race-condition free within a single process.",
      keyDecisions: [
        "Supports variable cost requests (e.g., heavy analytics queries costing 5 tokens vs ping costing 1).",
        "Computes integer remaining tokens for RFC standard HTTP header consumption.",
      ],
      complexityNotes:
        "Execution time < 100ns per invocation. Zero GC pressure when re-using result shapes.",
    },

    python: {
      filename: "rate_limiter.py",
      code: `import time
import threading
from typing import Tuple

class TokenBucket:
    """Thread-safe Token Bucket Rate Limiter with lazy refill."""

    def __init__(self, capacity: float, refill_rate_per_sec: float):
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate_per_sec)
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()
        self._lock = threading.Lock()

    def allow(self, cost: float = 1.0) -> Tuple[bool, float, float]:
        """
        Attempts to consume tokens.
        Returns: (is_allowed, remaining_tokens, retry_after_seconds)
        """
        with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.last_refill = now

            # Replenish tokens
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

            if self.tokens >= cost:
                self.tokens -= cost
                return True, self.tokens, 0.0

            deficit = cost - self.tokens
            retry_after = deficit / self.refill_rate
            return False, self.tokens, retry_after`,
      explanation:
        "Python implementation using time.monotonic() to be immune to system clock adjustments (NTP sync shifts). Protected with threading.Lock to ensure thread-safe operations in multithreaded WSGI/ASGI servers.",
      keyDecisions: [
        "Used time.monotonic() instead of time.time() to protect against clock drift and leap seconds.",
        "Used context manager with self._lock to ensure locks always release even on unexpected exceptions.",
      ],
      complexityNotes:
        "O(1) execution time. Negligible lock acquisition overhead for low-to-medium contention.",
    },

    java: {
      filename: "TokenBucketRateLimiter.java",
      code: `package com.engineeringlab.ratelimiter;

import java.util.concurrent.atomic.AtomicReference;

public class TokenBucketRateLimiter {
    private final double capacity;
    private final double refillRatePerSecond;
    private final AtomicReference<State> state;

    private static class State {
        final double tokens;
        final long lastRefillNanos;

        State(double tokens, long lastRefillNanos) {
            this.tokens = tokens;
            this.lastRefillNanos = lastRefillNanos;
        }
    }

    public TokenBucketRateLimiter(double capacity, double refillRatePerSecond) {
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
        this.state = new AtomicReference<>(new State(capacity, System.nanoTime()));
    }

    public boolean tryAcquire(double tokensToConsume) {
        while (true) {
            State current = state.get();
            long now = System.nanoTime();
            double elapsedSeconds = Math.max(0, (now - current.lastRefillNanos) / 1_000_000_000.0);
            double refilledTokens = Math.min(capacity, current.tokens + (elapsedSeconds * refillRatePerSecond));

            if (refilledTokens < tokensToConsume) {
                return false;
            }

            State next = new State(refilledTokens - tokensToConsume, now);
            if (state.compareAndSet(current, next)) {
                return true;
            }
            // CAS failed due to concurrent modification; loop and retry
        }
    }
}`,
      explanation:
        "Non-blocking, lock-free Java implementation leveraging AtomicReference and Compare-And-Swap (CAS) semantics. Avoids thread synchronization bottlenecks under high multi-core concurrency.",
      keyDecisions: [
        "Employed lock-free atomic CAS loop to prevent thread parking/unparking context switch overhead.",
        "Uses System.nanoTime() for nanosecond-precision monotonic elapsed calculations.",
      ],
      complexityNotes:
        "Lock-free O(1) amortized. Zero thread blocking, ideal for high-throughput Netty / reactive pipelines.",
    },
  },

  edgeCases: [
    {
      scenario: "Clock Skew and NTP Time Jumps",
      consequence:
        "If a server's clock steps backward during an NTP correction, elapsed time calculates as negative, temporarily freezing token refills.",
      solution:
        "Always use monotonic clocks (e.g. time.monotonic() in Python, System.nanoTime() in Java, or clamp elapsed time with Math.max(0, elapsed)).",
    },
    {
      scenario: "Distributed Thundering Herd on Limit Reset",
      consequence:
        "When a fixed window expires at 00:00:00, thousands of queued clients retry simultaneously, crushing the backend in a spike.",
      solution:
        "Migrate to sliding window counters or token buckets, and mandate randomized exponential backoff jitter on client retries.",
    },
    {
      scenario: "Redis Network Partition / Outage",
      consequence:
        "If the distributed Redis store becomes unreachable, synchronous rate limiter calls block until socket timeout, cascading into an API outage.",
      solution:
        "Wrap Redis calls in a strict timeout (<5ms) and circuit breaker; configure a fail-open policy that falls back to localized in-memory rate limiting.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Redis Central Bottleneck",
        description:
          "All API gateway instances pounding a single Redis primary node can exceed Redis single-thread 100k OPS throughput limit.",
        mitigation:
          "Shard keys using Redis Cluster hash slots, or use local token batching (reserve tokens in blocks of 20 from Redis to local memory).",
      },
      {
        title: "False Positive IP Blocking on Shared NAT",
        description:
          "Hundreds of distinct corporate or university users sharing an egress gateway IP address trip the per-IP rate limit.",
        mitigation:
          "Rate limit unauthenticated requests by IP with lenient limits, but throttle authenticated traffic strictly by account ID or API token.",
      },
    ],
    scaling10x: [
      "Implement client-side token batching: Gateway workers acquire 50 tokens at once from Redis to serve subsequent requests locally, reducing Redis network hops by 98%.",
      "Deploy rate limiting at edge proxies (Cloudflare Workers, AWS CloudFront, Envoy) before traffic hits origin compute instances.",
      "Switch from Sorted Set logs to Sliding Window Counters with probabilistic precision.",
    ],
    concurrencyRaceConditions: [
      "In distributed environments, multiple gateway nodes doing GET then SET on Redis encounter check-then-act race conditions; must use atomic Lua scripts.",
      "In high-core JVM environments, synchronized blocks cause thread starvation under 100k RPS; replace with CAS AtomicReference or LongAdder.",
    ],
    observability: {
      metrics: [
        "rate_limiter_requests_total{status='allowed|rejected', client_id}",
        "rate_limiter_tokens_remaining_gauge{client_id}",
        "rate_limiter_storage_latency_seconds (histogram with p95, p99)",
      ],
      logs: [
        "Structured JSON log upon 429 rejection containing client_id, IP, user_agent, path, tokens_remaining, and request_rate.",
      ],
      traces: [
        "OpenTelemetry span for 'ratelimit.evaluate' showing Redis round-trip latency.",
      ],
    },
    securityNotes: [
      "Always apply aggressive rate limiting to authentication routes (/login, /forgot-password) to prevent brute-force credential stuffing.",
      "Do not reveal user existence via differentiated rate limit response headers.",
    ],
  },

  tradeoffs: [
    {
      approach: "Token Bucket",
      advantages: "Handles legitimate traffic bursts; compact state; fast O(1) computation.",
      disadvantages: "Requires synchronized state or atomic scripts in distributed setups.",
      useWhen: "Standard public REST/GraphQL APIs where bursts are expected during page loads.",
    },
    {
      approach: "Leaky Bucket",
      advantages: "Guarantees perfectly smooth egress rate; protects fragile legacy backends.",
      disadvantages: "Drops or delays legitimate bursts; increases latency for bursty traffic.",
      useWhen: "Outbound queues feeding external third-party APIs with strict contractual limits.",
    },
    {
      approach: "Fixed Window",
      advantages: "Extremely simple; lowest storage footprint.",
      disadvantages: "Allows 2x limit at window boundaries; prone to stampedes at boundary reset.",
      useWhen: "Low-throughput internal services or coarse hourly/daily user tier quotas.",
    },
    {
      approach: "Sliding Window Counter",
      advantages: "Smooths boundary bursts; low memory footprint; high accuracy.",
      disadvantages: "Approximation algorithm assuming uniform distribution in prior window.",
      useWhen: "High-volume distributed gateways requiring balance of accuracy and memory efficiency.",
    },
  ],

  furtherReading: [
    {
      title: "Scaling your API with Rate Limiters",
      type: "Blog",
      authorOrOrg: "Stripe Engineering",
      description: "Foundational breakdown of token bucket and leaky bucket strategies in financial APIs.",
      url: "https://stripe.com/blog/rate-limiters",
    },
    {
      title: "RFC 6585: Additional HTTP Status Codes (Section 4: 429)",
      type: "RFC",
      authorOrOrg: "IETF",
      description: "Official specification of HTTP status 429 and Retry-After header semantics.",
      url: "https://datatracker.ietf.org/doc/html/rfc6585",
    },
    {
      title: "How We Built Rate Limiting Capable of 400 Million RPS",
      type: "Blog",
      authorOrOrg: "Cloudflare",
      description: "Architectural details of high-throughput sliding window rate limiting on global edge networks.",
      url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
    },
  ],
};
