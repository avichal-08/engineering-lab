# Invariants

> **Understand how software really works.**

Interactive engineering labs for understanding how software really works through simulations, experimentation, implementation, and failure.

---

## The Invariants Loop

Invariants rejects static documentation, passive blog articles, and trivia-based interview prep in favor of a 5-stage experiential loop:

1. **01 Deconstruct (Problem)** — Uncover why naive software models fail catastrophically under load.
2. **02 Sandbox (Visualize)** — Experiment with live state machines, circular hash rings, and token bucket reservoirs.
3. **03 Blueprint (Build)** — Trace data structures, concurrency locks, and algorithmic blueprints step-by-step.
4. **04 Stress Test (Break)** — Inject poison pills, clock skew, GC freezes, and network partition faults.
5. **05 Ship (Production)** — Study idiomatic, production-grade reference implementations in Go, TypeScript, Python, and Java.

---

## Curriculum Scope

While initial content is rooted in distributed systems resilience, Invariants is engineered to expand across computing fundamentals:

- **Distributed Systems** (Available Now)
- **Backend & Infrastructure**
- **Concurrency & Synchronization**
- **Databases & Storage Engines**
- **Networking Protocols**
- **Operating Systems Primitives**
- **Algorithms & Data Structures**
- **AI / Machine Learning Systems**

---

## 10 Foundational Labs

| Lab | Primitive | Category | Key Challenge |
| :--- | :--- | :--- | :--- |
| [**Rate Limiting**](http://localhost:3000/learn/rate-limiting) | Token Bucket & Leaky Bucket | Resilience | Burst handling, Redis Lua, monotonic clocks |
| [**Circuit Breaker**](http://localhost:3000/learn/circuit-breaker) | Three-state circuit finite state machine | Reliability | Fast-fail load shedding, canary probes |
| [**Retries & Backoff**](http://localhost:3000/learn/retries) | Exponential Backoff with Jitter | Reliability | Thundering herds, phase alignment de-correlation |
| [**Idempotency**](http://localhost:3000/learn/idempotency) | Transactional Replay Gate | Reliability | Duplicate payment prevention, payload hashing |
| [**Caching Strategies**](http://localhost:3000/learn/caching) | Cache-Aside & Mutex SingleFlight | Data | Cache stampede prevention, eviction races |
| [**Message Queues**](http://localhost:3000/learn/message-queues) | Competing Consumers & Visibility | Messaging | Poison pills, dead-letter quarantine (DLQ) |
| [**Publish-Subscribe**](http://localhost:3000/learn/pub-sub) | Fanout Broker with Consumer Groups | Messaging | Temporal decoupling, consumer lag isolation |
| [**Consistent Hashing**](http://localhost:3000/learn/consistent-hashing) | 360° Circular Hash Ring & VNodes | Distributed Systems | Minimal key migration ($K/N$), hot-spot reduction |
| [**Distributed Lock**](http://localhost:3000/learn/distributed-lock) | Redis / Redlock with Fencing | Distributed Systems | Kleppmann GC pause dilemma, monotonic fencing |
| [**Replication & Quorum**](http://localhost:3000/learn/replication-quorum) | Leaderless Dynamo-style Quorum | Distributed Systems | $W + R > N$ Pigeonhole principle, read repair |

---

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Animation**: Motion (Framer Motion)
- **Code Syntax Highlighting**: Shiki (build-time server-side pre-rendering)
- **Architecture**: 100% Static HTML generation (SSG) across all 19 routes with zero external runtime dependencies.

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.0 or newer)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/avichal-08/invariants.git
cd invariants

# Install dependencies
bun install

# Run the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
bun run build
bun run start
```

---

## Open Source & Contributing

Invariants is free and open-source. Contributions for new labs, clearer architectural diagrams, or additional reference implementations are welcome.

- **Repository**: [github.com/avichal-08/invariants](https://github.com/avichal-08/invariants)
- **Creator**: [@Avichal_08](https://x.com/Avichal_08)
- **License**: MIT
