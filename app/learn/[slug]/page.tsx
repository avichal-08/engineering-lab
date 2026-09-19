import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  getAllConcepts,
  getConceptBySlug,
  getAllSlugs,
  Concept,
  Language,
} from "@/content/concepts";
import { highlightCode } from "@/lib/shiki";
import { VisualizerDispatcher } from "@/components/visualizations";
import { CodeViewer } from "@/components/concepts/code-viewer";
import { SectionSidebar } from "@/components/concepts/section-sidebar";
import { RequestFlowDiagram } from "@/components/learning/request-flow-diagram";
import { FailureTimeline } from "@/components/learning/failure-timeline";
import { AlgorithmSelector } from "@/components/learning/algorithm-selector";
import { TokenBucketVisualizer } from "@/components/learning/token-bucket-visualizer";
import { BuildStepCard, BlueprintStep } from "@/components/learning/build-step-card";
import { IncidentCard, IncidentData } from "@/components/learning/incident-card";
import { ProductionChecklist } from "@/components/learning/production-checklist";
import { TradeoffExplorer } from "@/components/learning/tradeoff-explorer";
import { FurtherReadingGrid, ReadingResource } from "@/components/learning/further-reading-grid";
import { ProveItChallenge } from "@/components/learning/prove-it-challenge";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCode,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);
  if (!concept) return { title: "Lab Not Found" };

  return {
    title: `${concept.title}`,
    description: concept.shortDescription,
  };
}

// Concept-specific descriptions for Section 04 Interactive Visualizer
const visualizerDescriptions: Record<string, string> = {
  "rate-limiting":
    "Adjust capacity, refill rates, and packet arrival speeds. Trigger instant bursts or continuous streams to observe token consumption, bucket depletion, and HTTP 429 rejection branches.",
  "circuit-breaker":
    "Trip consecutive failures to watch the circuit state machine transition from CLOSED to OPEN, start the recovery sleep timer, and send single canary probes in HALF-OPEN mode.",
  "retries":
    "Compare delay curves between Deterministic Exponential Backoff, Equal Jitter, and Full Jitter. Observe why jitter eliminates destructive client thundering herds.",
  "idempotency":
    "Simulate payment mutations using an Idempotency-Key. Test duplicate replays, cached 200 responses, and payload conflict mismatches (HTTP 422).",
  "caching":
    "Simulate Cache-Aside hit and miss latency differentials (RAM 0.6ms vs Postgres 48ms). Watch TTL countdowns and mutation-triggered cache evictions.",
  "message-queues":
    "Run competing consumer worker threads with visibility timeouts. Inject poison pills to observe automatic quarantining into a Dead-Letter Queue (DLQ).",
  "pub-sub":
    "Broadcast domain events across isolated subscriber groups. Simulate subscriber outages and watch consumer lag accumulate without affecting neighboring services.",
  "consistent-hashing":
    "Interact with a 360° SVG hash ring. Add or remove Node D to inspect clockwise key reassignment and verify that only K/N keys migrate.",
  "distributed-lock":
    "Race Worker A and Worker B for a distributed lock. Simulate a 15-second Stop-The-World GC pause to see how monotonic fencing tokens reject stale writes.",
  "replication-quorum":
    "Adjust Write Quorum (W) and Read Quorum (R) across replica nodes. Crash nodes to test the W + R > N pigeonhole inequality and observe automatic read repair.",
};

// Dedicated Rate Limiting Blueprint Steps
const rateLimitingBlueprintSteps: BlueprintStep[] = [
  {
    stepNumber: 1,
    title: "Define Requirements & State Model",
    whyThisMatters: "Identify tenant identification key (API key vs IP) and bucket parameters (capacity B, refill rate r).",
    architectureImpact: "Determines state cardinality and whether storage fits entirely in L1 memory cache.",
    commonMistakes: [
      "Using client IP without proxy awareness (breaks for NAT/universities)",
      "Floating point token counts that cause precision drift",
    ],
    pseudocode: `type Bucket struct {
  capacity  int64     // maximum token capacity
  tokens    int64     // current available tokens
  refillRate int64    // tokens generated per unit time
  lastRefill time.Time // monotonic timestamp of previous evaluation
  mu        sync.Mutex
}`,
    implementationHint: "Always store integer counts of tokens (or scaled nanos) rather than floats.",
  },
  {
    stepNumber: 2,
    title: "Monotonic Clock Initialization",
    whyThisMatters: "System wall clocks can drift or leap backwards during NTP time synchronizations.",
    architectureImpact: "Leap backwards causes negative elapsed time, which would wipe out earned refill tokens.",
    commonMistakes: [
      "Using time.Now().Unix() instead of monotonic time structs",
      "Assuming time is universally synchronized across server nodes",
    ],
    pseudocode: `func NewBucket(capacity, refillRate int64) *Bucket {
  return &Bucket{
    capacity:   capacity,
    tokens:     capacity,
    refillRate: refillRate,
    lastRefill: time.Now(), // Captures monotonic reading
  }
}`,
    implementationHint: "In Go, time.Now() automatically includes a monotonic clock component unless stripped.",
  },
  {
    stepNumber: 3,
    title: "Atomic Concurrency Lock (Mutex)",
    whyThisMatters: "Two concurrent requests checking the bucket simultaneously could both observe 1 token and admit both.",
    architectureImpact: "Guarantees linearizability of the state transition without race conditions.",
    commonMistakes: [
      "Forgetting to defer Unlock(), risking deadlock if a panic occurs",
      "Holding the lock while executing downstream HTTP network I/O",
    ],
    pseudocode: `func (b *Bucket) Allow(cost int64) bool {
  b.mu.Lock()
  defer b.mu.Unlock() // Crucial: never hold lock across network requests

  b.refill()
  if b.tokens >= cost {
    b.tokens -= cost
    return true
  }
  return false
}`,
    implementationHint: "Keep the critical section bounded exclusively to memory reads and math arithmetic.",
  },
  {
    stepNumber: 4,
    title: "Lazy Refill Computation",
    whyThisMatters: "Avoids running thousands of idle background ticker goroutines for millions of customer keys.",
    architectureImpact: "Reduces idle CPU utilization to zero percent. Computation is deferred to request arrival.",
    commonMistakes: [
      "Spawning a time.Ticker per bucket instance (wastes OS thread resources)",
      "Integer division rounding down small fractions to zero tokens",
    ],
    pseudocode: `func (b *Bucket) refill() {
  now := time.Now()
  elapsed := now.Sub(b.lastRefill).Seconds()
  tokensToAdd := int64(elapsed * float64(b.refillRate))

  if tokensToAdd > 0 {
    b.tokens = min(b.capacity, b.tokens + tokensToAdd)
    b.lastRefill = now
  }
}`,
    implementationHint: "For sub-second precision, track elapsed duration in nanoseconds.",
  },
  {
    stepNumber: 5,
    title: "HTTP 429 & Standardized Headers",
    whyThisMatters: "RFC 6585 and IETF RateLimit standards inform clients exactly when their quota replenishes.",
    architectureImpact: "Empowers well-behaved client SDKs to sleep until Retry-After rather than retrying blindly.",
    commonMistakes: [
      "Returning HTTP 500 or 403 instead of 429 Too Many Requests",
      "Omitting the Retry-After header",
    ],
    pseudocode: `if !limiter.Allow(1) {
  w.Header().Set("Retry-After", strconv.FormatInt(secondsUntilNextToken, 10))
  w.Header().Set("X-RateLimit-Limit", strconv.FormatInt(capacity, 10))
  w.Header().Set("X-RateLimit-Remaining", "0")
  w.WriteHeader(http.StatusTooManyRequests)
  return
}`,
    implementationHint: "Format Retry-After as an integer delta-seconds for optimal compatibility.",
  },
  {
    stepNumber: 6,
    title: "Distributed Shared Ledger (Redis Lua)",
    whyThisMatters: "Single-node limiters break when API traffic is distributed across 20 gateway instances.",
    architectureImpact: "Centralizes state evaluation into an atomic script executed on the Redis server thread.",
    commonMistakes: [
      "Performing separate GET and SET commands without a Lua script (causes race conditions)",
      "Forgetting to set an EXPIRE TTL on the Redis key, leaking memory indefinitely",
    ],
    pseudocode: `-- Atomic Redis Lua Script (EVALSHA)
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
-- compute elapsed, refill, and compare...
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, 3600)
return allowed`,
    implementationHint: "Use EVALSHA to cache the script SHA1 hash and minimize round-trip packet bytes.",
  },
  {
    stepNumber: 7,
    title: "Fail-Open Resilience Strategy",
    whyThisMatters: "If the central Redis cluster becomes partitioned, the rate limiter must not block business revenue.",
    architectureImpact: "Favors availability over strict throttling during catastrophic infrastructure incidents.",
    commonMistakes: [
      "Failing closed by default, bringing down payment checkout if Redis has a blip",
      "Failing open silently without firing high-priority PagerDuty alerts",
    ],
    pseudocode: `func CheckRateLimit(ctx context.Context, key string) (bool, error) {
  ctx, cancel := context.WithTimeout(ctx, 15*time.Millisecond)
  defer cancel()

  allowed, err := redisClient.EvalSha(ctx, scriptSha, []string{key}, ...).Bool()
  if err != nil {
    // FAIL-OPEN: Record metric and allow traffic to proceed
    metrics.Increment("rate_limiter.fail_open.count")
    return true, nil
  }
  return allowed, nil
}`,
    implementationHint: "Cap Redis evaluation timeout at 15ms to protect overall API response latency.",
  },
];

// Dedicated Rate Limiting Failure Mode Incident Cards
const rateLimitingIncidents: IncidentData[] = [
  {
    id: "incident-1",
    problem: "Clock Skew Across Distributed Nodes",
    symptom: "Tokens are wiped out or clients receive 10x their allocated quota depending on which gateway processes the request.",
    whyItHappened: "Servers relied on wall-clock timestamps without synchronized hyper-precision or had unsynchronized NTP daemons.",
    engineeringFix: "Use server-side Redis TIME commands so time is evaluated exclusively by the Redis server's local monotonic clock.",
    severity: "CRITICAL",
  },
  {
    id: "incident-2",
    problem: "Retry Storm Following 429 Responses",
    symptom: "Throttling 10,000 requests causes incoming RPS to quadruple within 500ms, crashing the reverse proxy.",
    whyItHappened: "Clients did not respect the Retry-After header and did not incorporate randomized exponential backoff with full jitter.",
    engineeringFix: "Inject randomized Retry-After jitter (e.g. 2s ± 400ms) and reject retries at the perimeter edge CDN layer.",
    severity: "CRITICAL",
  },
  {
    id: "incident-3",
    problem: "Fixed Window Boundary Burst (2x Invariant Violation)",
    symptom: "A client configured for 1,000 req/min sends 2,000 requests within a 2-second window without being blocked.",
    whyItHappened: "The client sent 1,000 requests at 12:00:59 and another 1,000 requests at 12:01:00. Both windows counted independently.",
    engineeringFix: "Migrate to Token Bucket or Sliding Window Counter to mathematically smooth request evaluation across continuous time.",
    severity: "HIGH",
  },
  {
    id: "incident-4",
    problem: "Shared Redis Outage / Network Partition",
    symptom: "All API Gateway requests hang for 5 seconds and fail with HTTP 504 Gateway Timeout.",
    whyItHappened: "The limiter client library lacked a tight timeout (e.g. 15ms) and failed closed when Redis stopped responding.",
    engineeringFix: "Wrap Redis evaluation with a 15ms context timeout and a circuit breaker that fails open to local in-memory fallback.",
    severity: "CRITICAL",
  },
  {
    id: "incident-5",
    problem: "NAT Gateway & Shared IP Throttling",
    symptom: "An entire university or corporate building gets blocked when one student script triggers a rate limit.",
    whyItHappened: "Rate limiter identified clients purely by remote IP address without inspecting authenticated API keys or session tokens.",
    engineeringFix: "Compose tiered keys: limit authenticated users by User/Org ID, and use IP throttling strictly for unauthenticated endpoints.",
    severity: "HIGH",
  },
];

// Dedicated Rate Limiting Further Reading
const rateLimitingReading: ReadingResource[] = [
  {
    title: "Scaling your API with rate limiters",
    source: "Stripe Engineering",
    oneLineTakeaway: "How Stripe protects its payment API using token buckets and tiered load shedders.",
    category: "Engineering Blog",
    url: "https://stripe.com/blog/rate-limiters",
  },
  {
    title: "RFC 6585: Additional HTTP Status Codes (HTTP 429)",
    source: "IETF Standards",
    oneLineTakeaway: "The canonical standard defining 429 Too Many Requests and Retry-After response semantics.",
    category: "RFC",
    url: "https://www.rfc-editor.org/rfc/rfc6585",
  },
  {
    title: "Token Bucket Algorithm and Traffic Policing",
    source: "ACM & Network Working Group",
    oneLineTakeaway: "Original mathematical formalization of leaky and token bucket traffic shaping mechanisms.",
    category: "Academic Paper",
  },
  {
    title: "Rate Limiting Architecture at Cloudflare",
    source: "Cloudflare Systems Engineering",
    oneLineTakeaway: "Techniques for globally distributed rate limiting across hundreds of edge data centers without central sync.",
    category: "System Architecture",
    url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
  },
];

export default async function ConceptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);

  if (!concept) {
    notFound();
  }

  const isRateLimiting = slug === "rate-limiting";

  // Pre-render syntax highlighting on server via Shiki for all 4 languages
  const highlightedImplementations: any = {};
  const languages: Language[] = ["go", "typescript", "python", "java"];

  for (const lang of languages) {
    const impl = concept.codeImplementations[lang];
    if (impl) {
      const html = await highlightCode(impl.code, lang);
      highlightedImplementations[lang] = {
        lang,
        filename: impl.filename,
        rawCode: impl.code,
        html,
        explanation: impl.explanation,
        keyDecisions: impl.keyDecisions,
        complexityNotes: impl.complexityNotes,
      };
    }
  }

  // Navigation: prev & next concept
  const all = getAllConcepts();
  const currentIndex = all.findIndex((c) => c.slug === slug);
  const prevConcept = currentIndex > 0 ? all[currentIndex - 1] : null;
  const nextConcept = currentIndex < all.length - 1 ? all[currentIndex + 1] : null;

  const visualizerDescription =
    visualizerDescriptions[slug] ||
    "Interact directly with this distributed system primitive. Experiment with fault injection and observe state transitions.";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 font-sans">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="mb-14 space-y-4 border-b border-zinc-800/80 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/learn" className="hover:text-zinc-300 transition">
            Labs
          </Link>
          <span>/</span>
          <span className="text-zinc-400">{concept.category}</span>
          <span>/</span>
          <span className="text-cyan-400">{concept.slug}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-mono text-zinc-300">
            {concept.category}
          </span>
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-mono ${
              concept.difficulty === "Beginner"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                : concept.difficulty === "Intermediate"
                ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-400"
                : "border-purple-500/30 bg-purple-950/20 text-purple-400"
            }`}
          >
            {concept.difficulty}
          </span>
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{concept.estimatedTime}</span>
          </div>
        </div>

        <h1 className="font-serif-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          {concept.title}
        </h1>
        <p className="max-w-[72ch] text-base text-zinc-400 leading-relaxed">
          {concept.shortDescription}
        </p>

        {/* Topic Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {concept.topics.map((topic) => (
            <span
              key={topic}
              className="rounded bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 text-[11px] font-mono text-zinc-500"
            >
              #{topic}
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid: Sidebar TOC on Left (desktop), Content on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sticky Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-20 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
            <SectionSidebar />
          </div>
        </aside>

        {/* Main Content: 10 Strict Sections with Refined Rhythm and 960px max width */}
        <div className="lg:col-span-9 max-w-[960px] space-y-24">
          {/* SECTION 01: OVERVIEW */}
          <section id="overview" className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">01</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Overview</h2>
            </div>

            {isRateLimiting ? (
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">The Problem</span>
                  <blockquote className="border-l-2 border-cyan-400 pl-4 py-1 text-base sm:text-lg font-mono text-zinc-100 italic">
                    &ldquo;Traffic is bursty. Servers are finite.&rdquo;
                  </blockquote>
                </div>

                <RequestFlowDiagram />

                <p className="text-xs text-zinc-400 leading-relaxed max-w-[72ch]">
                  Unregulated ingress forces requests into unconstrained memory queues. When queue depth saturates thread pools, latency breaches timeouts and client retries trigger cascading outages.
                </p>

                <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-3.5 font-mono text-xs text-cyan-300">
                  <strong className="text-cyan-200 uppercase tracking-wider block mb-0.5">
                    Core Invariant:
                  </strong>
                  {concept.overview.coreInvariant}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    The Problem Statement
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed max-w-[72ch]">
                    {concept.overview.problemStatement}
                  </p>
                </div>

                <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-4 font-mono text-xs text-cyan-300">
                  <strong className="text-cyan-200 uppercase tracking-wider block mb-1">
                    System Invariant:
                  </strong>
                  {concept.overview.coreInvariant}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <span className="font-mono text-xs text-emerald-400 font-bold block">
                      ✓ When To Use
                    </span>
                    <ul className="space-y-1 text-xs text-zinc-400 list-disc list-inside">
                      {concept.overview.whenToUse.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs text-rose-400 font-bold block">
                      ✕ When NOT To Use
                    </span>
                    <ul className="space-y-1 text-xs text-zinc-400 list-disc list-inside">
                      {concept.overview.whenNotToUse.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 02: WHY IT EXISTS */}
          <section id="why-it-exists" className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">02</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Why It Exists</h2>
            </div>

            {isRateLimiting ? (
              <FailureTimeline />
            ) : (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <span className="font-mono text-xs uppercase tracking-wider text-rose-400 font-bold">
                    Catastrophic Outage Scenario
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed max-w-[72ch]">
                    {concept.whyItExists.catastrophicScenario}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
                  <span className="font-mono text-xs text-zinc-400 font-bold block uppercase tracking-wider">
                    Downstream System Degradation:
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-300 list-disc list-inside">
                    {concept.whyItExists.systemImpact.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 03: HOW IT WORKS */}
          <section id="how-it-works" className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">03</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">How It Works</h2>
            </div>

            {isRateLimiting ? (
              <AlgorithmSelector />
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  {concept.howItWorks.theoreticalExplanation.map((p, i) => (
                    <p key={i} className="text-xs text-zinc-300 leading-relaxed max-w-[72ch]">
                      {p}
                    </p>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 font-mono text-xs space-y-1">
                  <span className="text-cyan-400 font-bold block uppercase">
                    Single-Node vs Distributed Reality:
                  </span>
                  <p className="text-zinc-300 leading-relaxed max-w-[72ch]">
                    {concept.howItWorks.singleVsDistributed}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {concept.howItWorks.keyAlgorithms.map((algo, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-2"
                    >
                      <h4 className="font-mono text-sm font-bold text-zinc-100">{algo.name}</h4>
                      <p className="text-xs text-zinc-400 max-w-[72ch]">{algo.description}</p>
                      <div className="pt-2 text-[11px] font-mono space-y-1 border-t border-zinc-800/80">
                        <div className="text-emerald-400">+ {algo.pros}</div>
                        <div className="text-rose-400">- {algo.cons}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* PREDICT: PROVE IT CHALLENGE (Phase 6 Requirement) */}
          <section className="scroll-mt-24">
            <ProveItChallenge slug={slug} />
          </section>

          {/* SECTION 04: INTERACTIVE VISUALIZER (Main Event) */}
          <section id="visualize" className="scroll-mt-24 space-y-5 pt-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">04</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Interactive Visualizer</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch] pb-2">
              {visualizerDescription}
            </p>

            <div className="active-cyan-glow rounded-2xl">
              {isRateLimiting ? (
                <TokenBucketVisualizer />
              ) : (
                <VisualizerDispatcher type={concept.visualizerType} />
              )}
            </div>
          </section>

          {/* SECTION 05: BUILD IT STEP-BY-STEP */}
          <section id="build-it" className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">05</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Build It Step-by-Step</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              The engineering blueprint. Expand each sequential milestone to examine requirements, architectural impacts, common pitfalls, and blueprint pseudocode.
            </p>

            <div className="space-y-3">
              {isRateLimiting
                ? rateLimitingBlueprintSteps.map((step) => (
                    <BuildStepCard key={step.stepNumber} step={step} defaultOpen={step.stepNumber === 1} />
                  ))
                : concept.buildSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400">
                          {step.stepNumber}
                        </span>
                        <h3 className="font-mono text-sm font-bold text-zinc-100">{step.title}</h3>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed max-w-[72ch]">
                        {step.explanation}
                      </p>
                      {step.pseudocode && (
                        <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-cyan-200/90 overflow-x-auto whitespace-pre">
                          {step.pseudocode}
                        </pre>
                      )}
                    </div>
                  ))}
            </div>
          </section>

          {/* SECTION 06: CODE IMPLEMENTATION */}
          <section id="implementation" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">06</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Code Implementation</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              Production-ready, idiomatic reference implementations across Go, TypeScript, Python, and Java with sticky language switching, copy-to-clipboard, and source download.
            </p>

            <CodeViewer implementations={highlightedImplementations} />
          </section>

          {/* SECTION 07: EDGE CASES & FAILURE MODES */}
          <section id="edge-cases" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">07</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Edge Cases & Failure Modes</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              Investigate real-world production incidents. Expand each failure mode to analyze symptoms, root causes, and defensive engineering mitigations.
            </p>

            <div className="space-y-3">
              {isRateLimiting
                ? rateLimitingIncidents.map((inc) => (
                    <IncidentCard key={inc.id} incident={inc} />
                  ))
                : concept.edgeCases.map((ec, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 font-mono text-xs"
                    >
                      <div className="text-rose-400 font-bold text-sm">
                        Scenario: {ec.scenario}
                      </div>
                      <div className="text-zinc-300">
                        <strong className="text-zinc-400">Consequence: </strong>
                        {ec.consequence}
                      </div>
                      <div className="text-emerald-300 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded">
                        <strong className="text-emerald-200">Engineering Solution: </strong>
                        {ec.solution}
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          {/* SECTION 08: PRODUCTION CONSIDERATIONS */}
          <section id="production" className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">08</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Production Considerations</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              Production checklist covering observability metrics, horizontal sharding, reliability fail-open patterns, and client identity security.
            </p>

            {isRateLimiting ? (
              <ProductionChecklist />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                    Scaling to 10x / 100x Traffic:
                  </span>
                  <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
                    {concept.production.scaling10x.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3 font-mono text-xs">
                  <span className="uppercase tracking-wider text-cyan-400 block font-bold">
                    Telemetry & Observability:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 min-w-0">
                      <span className="text-zinc-500 font-bold block">PROMETHEUS METRICS:</span>
                      {concept.production.observability.metrics.map((m, i) => (
                        <div key={i} className="text-zinc-300 break-words">➔ {m}</div>
                      ))}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-zinc-500 font-bold block">DISTRIBUTED TRACES & LOGS:</span>
                      {concept.production.observability.traces.map((t, i) => (
                        <div key={i} className="text-zinc-300 break-words">➔ {t}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 09: TRADE-OFFS */}
          <section id="tradeoffs" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">09</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Trade-offs</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              Select an algorithm below to dynamically compare memory footprints, burst tolerance, boundary precision, and distributed suitability.
            </p>

            {isRateLimiting ? (
              <TradeoffExplorer />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
                    <tr>
                      <th className="p-3">Approach</th>
                      <th className="p-3">Advantages</th>
                      <th className="p-3">Disadvantages</th>
                      <th className="p-3">Use When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {concept.tradeoffs.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-900/30 transition">
                        <td className="p-3 font-bold text-zinc-200">{row.approach}</td>
                        <td className="p-3 text-emerald-400">{row.advantages}</td>
                        <td className="p-3 text-rose-400">{row.disadvantages}</td>
                        <td className="p-3 text-zinc-400">{row.useWhen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 10: FURTHER READING */}
          <section id="further-reading" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">10</span>
              <h2 className="font-serif-heading text-2xl font-bold text-white tracking-tight">Further Reading</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-[72ch]">
              Authoritative industry references, IETF RFC standards, and systems engineering papers.
            </p>

            {isRateLimiting ? (
              <FurtherReadingGrid resources={rateLimitingReading} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {concept.furtherReading.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                        <span>{item.type.toUpperCase()}</span>
                        <span>{item.authorOrOrg}</span>
                      </div>
                      <h4 className="font-mono text-sm font-bold text-zinc-200">{item.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-[72ch]">
                        {item.description}
                      </p>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-400 hover:underline pt-2 inline-block"
                      >
                        Read Paper / Source ➔
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Navigation Footer (Prev / Next Lab) */}
          <div className="border-t border-zinc-800 pt-8 flex flex-wrap items-center justify-between gap-4">
            {prevConcept ? (
              <Link
                href={`/learn/${prevConcept.slug}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 block">PREVIOUS LAB</span>
                  <span>{prevConcept.title}</span>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextConcept ? (
              <Link
                href={`/learn/${nextConcept.slug}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition ml-auto"
              >
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">NEXT LAB</span>
                  <span>{nextConcept.title}</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
