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

  // Machine Learning Track
  "linear-regression": {
    slug: "linear-regression",
    conceptTitle: "Linear Regression",
    scenario: {
      given: "A dataset has 10 points generated by y = 2x + 1. An extreme outlier is introduced at (x=10, y=0).",
      question: "When minimizing Mean Squared Error (MSE) to fit the line y = wx + b, how does this single outlier affect the model parameters?",
    },
    options: [
      {
        id: "a",
        label: "The outlier is automatically ignored because 10 points easily outvote 1 point.",
        explanation: "Incorrect. MSE penalizes errors quadratically (e²), giving distant points disproportionate leverage.",
      },
      {
        id: "b",
        label: "The regression line is aggressively pulled downward toward the outlier, destroying accuracy across the 10 legitimate points.",
        explanation: "Correct! The quadratic penalty (y - ŷ)² means a point with error 20 contributes 400 to the loss, dominating all normal points.",
      },
      {
        id: "c",
        label: "The slope w increases to compensate for the disturbance.",
        explanation: "Incorrect. At x=10 with y=0, the error pulls the slope downward toward zero.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The fundamental vulnerability of Ordinary Least Squares (MSE) is quadratic leverage: points far from the line exert polynomial pull on gradients. Robust regression solves this using Huber loss or L1 loss (MAE), which caps gradient magnitude for extreme residuals.",
    whatHappensNext: "Drag an outlier to the corner in the Linear Regression visualizer below and watch the fitted line twist immediately.",
  },
  "gradient-descent": {
    slug: "gradient-descent",
    conceptTitle: "Gradient Descent",
    scenario: {
      given: "A 1D convex loss landscape has quadratic curvature J(w) = 0.5·w² with Lipschitz constant L = 1.0 (maximum stable learning rate is 2/L = 2.0). The model starts at w = 3.0.",
      question: "If an engineer sets learning rate η = 2.2, what happens after 10 gradient descent steps?",
    },
    options: [
      {
        id: "a",
        label: "The model converges faster to the minimum w = 0 in fewer epochs.",
        explanation: "Incorrect. Learning rate exceeds the mathematical stability boundary (2/L).",
      },
      {
        id: "b",
        label: "The parameter w oscillates across the minimum with exponentially growing amplitude, quickly diverging to ±infinity (NaN).",
        explanation: "Correct! Because |1 - ηL| = |1 - 2.2| = 1.2 > 1, each step overshoots by 120%, multiplying the parameter exponentially: 3.0 → -3.6 → 4.32 → -5.18...",
      },
      {
        id: "c",
        label: "The model halts automatically at the nearest saddle point.",
        explanation: "Incorrect. Pure gradient descent has no automatic governor and executes the divergent update unconditionally.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Gradient Descent is fundamentally an Euler numerical integration of the differential equation dw/dt = -∇J(w). If the discretization step size η exceeds 2/L where L is the maximum eigenvalue of the Hessian matrix, the recurrence relation is unstable and diverges exponentially.",
    whatHappensNext: "Select 'Excessive η (2.2)' in the loss bowl simulator below to watch the parameter ball launch out of the bowl to infinity.",
  },
  "classification": {
    slug: "classification",
    conceptTitle: "Classification & Decision Boundaries",
    scenario: {
      given: "A fraud detection dataset contains 9,900 legitimate transactions (Class 0) and 100 fraudulent transactions (Class 1). An engineer trains a naive classifier that predicts 'Legitimate' for every single input.",
      question: "What are the model's Accuracy and Recall for the fraudulent class?",
    },
    options: [
      {
        id: "a",
        label: "Accuracy: 50.0%, Recall: 50.0%",
        explanation: "Incorrect. The dataset is heavily imbalanced, so equal metrics do not apply.",
      },
      {
        id: "b",
        label: "Accuracy: 99.0%, Recall: 0.0%",
        explanation: "Correct! The model gets 9,900 out of 10,000 correct (99% accuracy), but catches 0 out of 100 frauds (0% recall), making it completely useless in production.",
      },
      {
        id: "c",
        label: "Accuracy: 99.0%, Recall: 99.0%",
        explanation: "Incorrect. Recall measures true positives over actual positives (TP / (TP + FN)) = 0 / 100 = 0%.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The Accuracy Paradox demonstrates why Accuracy is a misleading metric for imbalanced datasets. A dummy model predicting the majority class achieves deceptive high accuracy while having zero utility. Production classification systems must monitor Recall, Precision, PR-AUC, or F1 score.",
    whatHappensNext: "Click 'Imbalance (95/5 Trap)' in the Classification visualizer below to see a 95% accuracy model with 0% recall.",
  },
  "k-means": {
    slug: "k-means",
    conceptTitle: "K-Means Clustering",
    scenario: {
      given: "A dataset consists of two concentric circular rings of data (inner circle radius 2, outer circle radius 8). An engineer sets K = 2 and runs K-Means until convergence.",
      question: "Will K-Means successfully separate the inner ring from the outer ring?",
    },
    options: [
      {
        id: "a",
        label: "Yes, because K=2 matches the natural number of structures in the data.",
        explanation: "Incorrect. K-Means only clusters based on spherical Euclidean distance to centroid coordinates.",
      },
      {
        id: "b",
        label: "No. K-Means creates linear Voronoi partition boundaries; it will slice both concentric circles in half with a straight line through the center.",
        explanation: "Correct! The invariant of K-Means is that cluster boundaries are perpendicular bisectors between centroids. It cannot learn non-convex, manifold, or concentric topologies.",
      },
      {
        id: "c",
        label: "Yes, provided K-Means++ initialization is used.",
        explanation: "Incorrect. K-Means++ only improves centroid starting locations; it cannot change the linear Voronoi geometry of the algorithm.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "K-Means assumes clusters are spherical, isotropic, and linearly separable in Euclidean space. For manifold topologies like concentric rings or spirals, non-linear algorithms such as DBSCAN, Spectral Clustering, or UMAP must be employed.",
    whatHappensNext: "Select 'Non-Spherical' dataset in the K-Means simulator below to see how centroids get trapped.",
  },
  "decision-trees": {
    slug: "decision-trees",
    conceptTitle: "Decision Trees",
    scenario: {
      given: "A training dataset contains 500 samples with 10% label noise (randomly flipped target classes). The tree is allowed to grow to unlimited depth with min_samples_split = 2.",
      question: "How will the training error and validation error compare when tree growth halts?",
    },
    options: [
      {
        id: "a",
        label: "Both training error and validation error will converge to ~10%.",
        explanation: "Incorrect. Unlimited depth allows the tree to create single-sample leaves that isolate every noisy point.",
      },
      {
        id: "b",
        label: "Training error will be 0.0% (perfect fit), while validation error will be severely degraded due to catastrophic overfitting.",
        explanation: "Correct! The tree splits until every single leaf is 100% pure, memorizing noise patterns that fail completely on unseen test data.",
      },
      {
        id: "c",
        label: "Training error will be high because the tree gets confused by noise.",
        explanation: "Incorrect. Greedy tree splitting will isolate outliers with deep specialized orthogonal cuts.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Unconstrained decision trees have high variance and zero inductive bias against deep hierarchical memorization. In production, decision trees must be constrained via max_depth, min_samples_leaf, cost-complexity pruning, or ensembled into Random Forests.",
    whatHappensNext: "Slide Depth to 5 in the Decision Tree visualizer below and notice how training hits 100% while validation drops.",
  },

  // Deep Learning Track
  "neurons": {
    slug: "neurons",
    conceptTitle: "Neurons & Forward Propagation",
    scenario: {
      given: "A single neuron uses standard ReLU activation f(z) = max(0, z). Its weighted sum calculates z = -3.5.",
      question: "What is the neuron's output activation a, and what gradient ∂L/∂w does it transmit to its incoming weights during backpropagation?",
    },
    options: [
      {
        id: "a",
        label: "Output a = -3.5, Gradient ∂L/∂w = -3.5.",
        explanation: "Incorrect. ReLU strictly maps negative inputs to 0.",
      },
      {
        id: "b",
        label: "Output a = 0.0, and Gradient ∂L/∂w = 0.0 (the neuron is dead and cannot update its weights).",
        explanation: "Correct! Since z < 0, ReLU output is 0 and its derivative f'(z) = 0. By the Chain Rule, multiplying by zero completely kills the gradient flow.",
      },
      {
        id: "c",
        label: "Output a = 0.0, but gradient flows normally via the bias.",
        explanation: "Incorrect. The derivative f'(z) multiplies all incoming weight gradients, extinguishing them all.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The 'Dying ReLU' problem occurs when a neuron's activation falls below zero. Because ReLU's derivative is strictly 0 for z < 0, no gradient flows backward during backpropagation. The neuron's weights freeze permanently unless leaky variants (LeakyReLU, GELU) are used.",
    whatHappensNext: "Click 'Induce Dead ReLU' in the neuron computation graph below and verify that output and gradients drop to zero.",
  },
  "activation-functions": {
    slug: "activation-functions",
    conceptTitle: "Activation Functions",
    scenario: {
      given: "A 4-layer feedforward network uses Sigmoid activation σ(z) = 1 / (1 + e⁻ᶻ) in all layers. The inputs to all layers saturate at |z| > 5.0.",
      question: "What happens to the gradient signal arriving at the first layer during backpropagation?",
    },
    options: [
      {
        id: "a",
        label: "The gradients multiply together and explode toward infinity.",
        explanation: "Incorrect. Exploding gradients happen when weights are large and activations are unbounded.",
      },
      {
        id: "b",
        label: "The gradient vanishes exponentially toward zero (~10⁻⁸), freezing the weights in early layers.",
        explanation: "Correct! The derivative of Sigmoid peaks at 0.25 and drops to <0.005 when saturated. Multiplied across 4 layers, (0.005)⁴ ≈ 6×10⁻¹⁰, extinguishing the gradient.",
      },
      {
        id: "c",
        label: "The network switches to linear behavior.",
        explanation: "Incorrect. Saturated sigmoid outputs a flat constant (0 or 1), not a linear slope.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The Vanishing Gradient problem plagued deep neural networks until the adoption of ReLU. Because σ'(z) ≤ 0.25 everywhere, the Chain Rule product ∏ σ'(z_l) diminishes exponentially with network depth L as (1/4)^L, paralyzing the earliest representation layers.",
    whatHappensNext: "Drag the input probe to x = 4.0 on the Sigmoid curve below and observe how the derivative f'(x) collapses to near zero.",
  },
  "backpropagation": {
    slug: "backpropagation",
    conceptTitle: "Backpropagation",
    scenario: {
      given: "A multi-layer neural network initializes all weights and biases in hidden layers to exactly 0.0 (w_ij = 0).",
      question: "What happens during the first training step when backpropagation updates the weights?",
    },
    options: [
      {
        id: "a",
        label: "The network trains normally because gradient descent will steer each neuron toward different features.",
        explanation: "Incorrect. Every neuron starts in the identical state and receives the identical gradient.",
      },
      {
        id: "b",
        label: "Symmetry Breaking Fails: all hidden neurons compute the exact same activations and receive the exact same gradient, updating identically and collapsing the layer to a single redundant neuron.",
        explanation: "Correct! Without random weight initialization (e.g. He or Xavier initialization), all neurons in a layer remain symmetric clones forever.",
      },
      {
        id: "c",
        label: "The loss immediately becomes NaN due to division by zero.",
        explanation: "Incorrect. Zero weights do not cause division by zero in standard feedforward layers.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Symmetry Breaking is an absolute prerequisite for deep learning. If weights start at zero, partial derivatives ∂L/∂w_j are identical for every hidden unit j in layer l. Proper random initialization breaks symmetry so individual neurons specialize on distinct orthogonal features.",
    whatHappensNext: "Step through the Forward Pass, Backward Pass, and Update stages in the flagship Backprop visualizer below.",
  },
  "convolutional-networks": {
    slug: "convolutional-networks",
    conceptTitle: "Convolutional Networks",
    scenario: {
      given: "An input image has dimensions 32×32 pixels. It passes through a convolutional layer with a 5×5 kernel, stride S = 1, and zero padding P = 0 (valid convolution).",
      question: "What are the spatial dimensions (height × width) of the output feature map?",
    },
    options: [
      {
        id: "a",
        label: "32×32",
        explanation: "Incorrect. That would require padding P = (K - 1) / 2 = 2 pixels.",
      },
      {
        id: "b",
        label: "28×28",
        explanation: "Correct! Formula: Output = (Input - Kernel + 2·Padding)/Stride + 1 = (32 - 5 + 0)/1 + 1 = 28×28. Valid convolution shrinks boundaries by K - 1 = 4 pixels.",
      },
      {
        id: "c",
        label: "16×16",
        explanation: "Incorrect. Stride is 1, not 2. A stride of 2 would halve the dimension.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "The spatial output dimension of a 2D convolution is governed by the geometric equation W_out = ⌊(W_in - K + 2P)/S⌋ + 1. Understanding spatial reduction and receptive field expansion is critical for designing CNN architectures and memory budgeting.",
    whatHappensNext: "Slide the 3×3 kernel across the 6×6 image in the visualizer below to see how a 4×4 feature map and 2×2 pooled layer are constructed.",
  },
  "attention": {
    slug: "attention",
    conceptTitle: "Attention Mechanism",
    scenario: {
      given: "In a self-attention layer with embedding dimension d_k = 64, an engineer calculates raw dot-product scores as Q·Kᵀ without dividing by √d_k before applying Softmax.",
      question: "What is the mathematical consequence of omitting the 1 / √d_k scaling factor?",
    },
    options: [
      {
        id: "a",
        label: "The attention scores become negative and crash the Softmax function.",
        explanation: "Incorrect. Dot products can be negative, and Softmax gracefully handles negative inputs via exponentiation e^z.",
      },
      {
        id: "b",
        label: "For large d_k, the dot products grow large in magnitude, pushing Softmax into regions with extremely small gradients (vanishing gradients during backprop).",
        explanation: "Correct! If Q and K have mean 0 and variance 1, their dot product has variance d_k = 64 (standard deviation 8). Unscaled values like ±16 push Softmax to 0 or 1 where its gradient is virtually zero.",
      },
      {
        id: "c",
        label: "The model runs 64 times slower because matrix multiplication takes longer.",
        explanation: "Incorrect. The scaling factor is a single scalar division, which has negligible compute cost.",
      },
    ],
    correctOptionId: "b",
    engineeringReasoning: "Vaswani et al. introduced Scaled Dot-Product Attention Attention(Q, K, V) = softmax(QKᵀ / √d_k)V specifically to counteract variance explosion. Without dividing by √d_k, large embeddings saturate Softmax into an argmax step with zero backpropagated gradients.",
    whatHappensNext: "Select token 'it' in the Attention Visualizer below and observe how the attention distribution resolves co-reference to 'animal'.",
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
