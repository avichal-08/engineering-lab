import { Concept } from "./types";

export const messageQueues: Concept = {
  slug: "message-queues",
  title: "Message Queues & Producer-Consumer",
  shortDescription:
    "Decouple system components, absorb asynchronous traffic spikes, and manage worker task distribution with acknowledgements and Dead-Letter Queues.",
  category: "Messaging",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Asynchronous Processing",
    "Visibility Timeout",
    "Message Acknowledgement (ACK/NACK)",
    "Dead-Letter Queues (DLQ)",
    "Backpressure",
    "FIFO vs Standard Queues",
  ],

  overview: {
    problemStatement:
      "When slow, compute-heavy tasks (e.g. video transcoding, PDF generation, credit card settlement, email dispatch) are executed synchronously within user HTTP request cycles, web threads block for seconds, client connections time out, and sudden spikes crash the web tier.",
    whenToUse: [
      "Decoupling slow background operations from synchronous user-facing HTTP responses.",
      "Smoothing out bursty workloads (e.g., absorbing Black Friday checkout order generation).",
      "Work distribution across an autoscaling pool of worker nodes.",
      "Ensuring durable delivery even when downstream processors are temporarily offline.",
    ],
    whenNotToUse: [
      "Low-latency synchronous request-response RPCs (e.g. validating login credentials).",
      "Event streaming where thousands of consumers must read the same continuous immutable log independently (use Pub/Sub or Kafka).",
      "Simple in-memory thread communication within a single process where Go channels or thread pools suffice.",
    ],
    coreInvariant:
      "Every produced message must be durably stored and delivered to at least one consumer; on processing failure, the message must be retried until an explicit Dead-Letter Queue threshold is reached.",
  },

  whyItExists: {
    realWorldProblem:
      "An image processing SaaS processes photo uploads. Generating 5 thumbnails takes 4 seconds of heavy CPU. If 1,000 users upload simultaneously, 1,000 web threads saturate 100% of server CPU. HTTP health checks fail, the load balancer removes all servers, and the site goes completely dark.",
    catastrophicScenario:
      "An automated payroll service attempts to transfer payments for 200,000 employees. The synchronous HTTP client crashes halfway through at record #104,200 due to an out-of-memory error. Because there was no durable queue tracking job state and offsets, nobody knows which employees got paid, which didn't, or where to restart, requiring days of manual database forensics.",
    systemImpact: [
      "Blocking of HTTP ingress connection pools.",
      "Loss of user submissions when servers crash mid-execution.",
      "Total inability to throttle or smooth downstream load.",
      "Tight coupling between unrelated subsystems.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "The Producer-Consumer pattern introduces a durable FIFO or priority buffer between the initiator (Producer) and the executor (Consumer).",
      "When a producer enqueues a job, the queue persists it to disk or memory and immediately returns a job ID to the producer, completing the HTTP request in <5ms.",
      "Workers continuously poll or receive messages from the queue. When a worker receives a message, the message enters a 'Visibility Timeout' window during which other workers cannot see or claim it.",
      "If the worker completes successfully, it sends an ACK (acknowledgement), permanently deleting the message. If the worker crashes or sends a NACK (negative acknowledgement), the visibility timeout expires and the message becomes visible to other workers.",
      "If a poison-pill message repeatedly fails more than maxReceiveCount times, the queue automatically routes it to a Dead-Letter Queue (DLQ) for human inspection, preventing endless crash loops.",
    ],
    singleVsDistributed:
      "Single-process queues use in-memory buffers (e.g. Go channels or Java BlockingQueue) with zero persistence. Distributed queues (e.g. SQS, RabbitMQ, Celery/Redis) replicate messages across clustered broker nodes, ensuring zero data loss even if individual brokers fail.",
    semanticsAndGuarantees: [
      "At-least-once delivery: Messages may occasionally be delivered more than once if worker ACK packets are dropped on the wire.",
      "Visibility timeout: Leases messages to workers for a bounded duration.",
      "Dead-lettering: Isolates unprocessable poisoned payloads.",
    ],
    keyAlgorithms: [
      {
        name: "Visibility Timeout Leasing",
        description: "Locks a message for T seconds upon consumer receipt. Automatically unlocks if ACK is not received before T expires.",
        pros: "Recovers automatically from worker crashes without centralized heartbeat daemons.",
        cons: "If a slow task takes T + 1 seconds, a second worker starts duplicate processing.",
      },
      {
        name: "Exponential Delayed Retry Queue",
        description: "Failed messages are routed to secondary retry queues with progressively longer delays (10s, 60s, 300s) before hitting the DLQ.",
        pros: "Provides recovering downstream services exponential breathing room.",
        cons: "Increases queuing complexity and out-of-order execution.",
      },
      {
        name: "Fair-Share Work Stealing",
        description: "Distributes jobs to the least-loaded worker based on consumer prefetch limits.",
        pros: "Prevents fast workers from starving while slow workers are backlogged.",
        cons: "Requires dynamic consumer metric tracking.",
      },
    ],
  },

  visualizerType: "queue",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Define Message Envelope & Schema",
      summary: "Structure message payloads with unique IDs, timestamps, and attempt counts.",
      explanation:
        "Every message must contain: id (UUID), payload (JSON bytes), attemptCount (int), maxAttempts (int), createdAt (timestamp), and correlationId for distributed tracing.",
      pseudocode: `struct Message {
  id: string
  payload: bytes
  attempts: int
  maxAttempts: int
  visibleAfter: timestamp
}`,
      considerations: [
        "Include tracing headers (W3C traceparent) to correlate logs across producer and worker.",
      ],
    },
    {
      stepNumber: 2,
      title: "Implement Durable Enqueue (Producer)",
      summary: "Store message in queue and notify waiting workers.",
      explanation:
        "The producer writes the message envelope to the storage buffer and returns an acknowledgement to the client.",
      considerations: [
        "Enforce message size limits (e.g., max 256KB); use claim-check pattern (S3 URL) for big files.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Dequeue with Visibility Timeout",
      summary: "Atomically retrieve message and hide it from competing workers.",
      explanation:
        "Query the next message where `visibleAfter <= now()`. Update `visibleAfter = now() + visibilityTimeout` and `attempts = attempts + 1` atomically.",
      pseudocode: `function dequeue(timeout):
  msg = buffer.find(visibleAfter <= now)
  if msg:
    msg.visibleAfter = now + timeout
    msg.attempts++
    return msg`,
      considerations: [
        "Use row-level locking (SELECT FOR UPDATE SKIP LOCKED in SQL) to prevent worker contention.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Acknowledgement (ACK)",
      summary: "Permanently remove successfully processed message.",
      explanation:
        "Upon successful execution of the business task, the worker sends ACK with the message ID. The broker deletes the message from the queue.",
      considerations: [
        "Do not ACK until the database write or side effect is committed.",
      ],
    },
    {
      stepNumber: 5,
      title: "Handle Negative Acknowledgement & Timeout (NACK)",
      summary: "Re-queue message when execution fails.",
      explanation:
        "If worker throws an exception, it sends NACK. The queue sets `visibleAfter = now()`, immediately allowing another worker to claim it.",
      considerations: [
        "Add backoff delay on NACK to avoid instant re-failure on transient blips.",
      ],
    },
    {
      stepNumber: 6,
      title: "Route Poison Pills to Dead-Letter Queue (DLQ)",
      summary: "Quarantine unprocessable messages after max attempts.",
      explanation:
        "If a message exceeds maxAttempts (e.g. 5 retries), do not return it to the main queue. Move it to the DLQ and emit a high-priority alert.",
      pseudocode: `if msg.attempts >= msg.maxAttempts:
  dlq.push(msg)
  buffer.delete(msg.id)
  emitAlert("Message moved to DLQ: " + msg.id)`,
      considerations: [
        "DLQs must be monitored; without alerts, messages silently rot in the DLQ.",
      ],
    },
    {
      stepNumber: 7,
      title: "Enforce Consumer Backpressure & Concurrency Limits",
      summary: "Prevent workers from pulling more jobs than memory can handle.",
      explanation:
        "Configure consumer prefetch limits (e.g. prefetch=10). If worker CPU exceeds 80%, pause polling until active jobs finish.",
      considerations: [
        "Unconstrained pulling causes out-of-memory crashes on worker nodes.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "queue.go",
      code: `package queue

import (
	"context"
	"errors"
	"sync"
	"time"
)

type Message struct {
	ID           string
	Payload      []byte
	Attempts     int
	MaxAttempts  int
	VisibleAfter time.Time
}

type MemoryQueue struct {
	mu          sync.Mutex
	messages    map[string]*Message
	dlq         map[string]*Message
	notifyCh    chan struct{}
	visibility  time.Duration
}

func NewMemoryQueue(visibility time.Duration) *MemoryQueue {
	return &MemoryQueue{
		messages:   make(map[string]*Message),
		dlq:        make(map[string]*Message),
		notifyCh:   make(chan struct{}, 1),
		visibility: visibility,
	}
}

func (q *MemoryQueue) Enqueue(id string, payload []byte, maxAttempts int) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.messages[id] = &Message{
		ID:           id,
		Payload:      payload,
		Attempts:     0,
		MaxAttempts:  maxAttempts,
		VisibleAfter: time.Now(),
	}

	select {
	case q.notifyCh <- struct{}{}:
	default:
	}
}

// Dequeue claims a visible message with visibility timeout lease.
func (q *MemoryQueue) Dequeue(ctx context.Context) (*Message, error) {
	for {
		q.mu.Lock()
		now := time.Now()

		for _, msg := range q.messages {
			if now.After(msg.VisibleAfter) {
				msg.Attempts++
				if msg.Attempts > msg.MaxAttempts {
					// Route poison pill to DLQ
					q.dlq[msg.ID] = msg
					delete(q.messages, msg.ID)
					continue
				}

				// Lease message
				msg.VisibleAfter = now.Add(q.visibility)
				q.mu.Unlock()
				return msg, nil
			}
		}
		q.mu.Unlock()

		select {
		case <-q.notifyCh:
		case <-time.After(50 * time.Millisecond):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
}

func (q *MemoryQueue) Ack(id string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	delete(q.messages, id)
}

func (q *MemoryQueue) Nack(id string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if msg, ok := q.messages[id]; ok {
		msg.VisibleAfter = time.Now() // make visible immediately
	}
}`,
      explanation:
        "Complete Go memory queue engine featuring visibility timeout leasing, atomic ACK/NACK mechanics, and automatic Poison-Pill Dead-Letter Queue routing.",
      keyDecisions: [
        "Uses notification channel combined with select timeouts to eliminate spinning CPU burn during idle periods.",
        "Enforces max attempt threshold before moving poison pills to DLQ.",
      ],
      complexityNotes: "Thread-safe O(N) scan in memory buffer; easily adapted to SQL with SKIP LOCKED.",
    },

    typescript: {
      filename: "MessageQueue.ts",
      code: `export interface QueueMessage<T> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  visibleAfter: number;
}

export class MessageQueue<T> {
  private messages = new Map<string, QueueMessage<T>>();
  private deadLetterQueue = new Map<string, QueueMessage<T>>();

  constructor(private readonly visibilityTimeoutMs: number = 10000) {}

  public enqueue(id: string, data: T, maxAttempts = 3): void {
    this.messages.set(id, {
      id,
      data,
      attempts: 0,
      maxAttempts,
      visibleAfter: Date.now(),
    });
  }

  public dequeue(): QueueMessage<T> | null {
    const now = Date.now();

    for (const [id, msg] of this.messages.entries()) {
      if (now >= msg.visibleAfter) {
        msg.attempts++;

        if (msg.attempts > msg.maxAttempts) {
          // Quarantine into DLQ
          this.deadLetterQueue.set(id, msg);
          this.messages.delete(id);
          continue;
        }

        // Lock with visibility lease
        msg.visibleAfter = now + this.visibilityTimeoutMs;
        return msg;
      }
    }

    return null;
  }

  public ack(id: string): void {
    this.messages.delete(id);
  }

  public nack(id: string, retryDelayMs = 0): void {
    const msg = this.messages.get(id);
    if (msg) {
      msg.visibleAfter = Date.now() + retryDelayMs;
    }
  }

  public getDlqSize(): number {
    return this.deadLetterQueue.size;
  }
}`,
      explanation:
        "TypeScript Queue engine modeling visibility timeouts, DLQ quarantine, and ACK/NACK transitions for background job processing.",
      keyDecisions: [
        "Clear distinction between active queue buffer and dead-letter quarantine map.",
        "Configurable delayed visibility on NACK for gentle backoff.",
      ],
      complexityNotes: "O(N) message scanning.",
    },

    python: {
      filename: "message_queue.py",
      code: `import time
import threading
from typing import Optional, Dict, Any

class Message:
    def __init__(self, msg_id: str, data: Any, max_attempts: int = 3):
        self.id = msg_id
        self.data = data
        self.attempts = 0
        self.max_attempts = max_attempts
        self.visible_after = time.time()

class MessageQueue:
    def __init__(self, visibility_timeout_sec: float = 10.0):
        self.visibility_timeout = visibility_timeout_sec
        self._lock = threading.Lock()
        self._messages: Dict[str, Message] = {}
        self._dlq: Dict[str, Message] = {}

    def enqueue(self, msg_id: str, data: Any, max_attempts: int = 3):
        with self._lock:
            self._messages[msg_id] = Message(msg_id, data, max_attempts)

    def dequeue(self) -> Optional[Message]:
        with self._lock:
            now = time.time()
            for msg_id, msg in list(self._messages.items()):
                if now >= msg.visible_after:
                    msg.attempts += 1
                    if msg.attempts > msg.max_attempts:
                        self._dlq[msg_id] = msg
                        del self._messages[msg_id]
                        continue

                    msg.visible_after = now + self.visibility_timeout
                    return msg
            return None

    def ack(self, msg_id: str):
        with self._lock:
            self._messages.pop(msg_id, None)

    def nack(self, msg_id: str):
        with self._lock:
            msg = self._messages.get(msg_id)
            if msg:
                msg.visible_after = time.time()`,
      explanation:
        "Thread-safe Python message queue using threading.Lock with automatic dead-letter queue isolation for toxic inputs.",
      keyDecisions: [
        "Iterates over list(self._messages.items()) to safely modify dictionary during quarantine transitions.",
        "Locks guard all state mutations.",
      ],
      complexityNotes: "O(N) lookup; thread-safe.",
    },

    java: {
      filename: "ReliableQueue.java",
      code: `package com.engineeringlab.queue;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

public class ReliableQueue<T> {
    public static class Message<T> {
        public final String id;
        public final T data;
        public int attempts = 0;
        public final int maxAttempts;
        public Instant visibleAfter;

        public Message(String id, T data, int maxAttempts) {
            this.id = id;
            this.data = data;
            this.maxAttempts = maxAttempts;
            this.visibleAfter = Instant.now();
        }
    }

    private final Duration visibilityTimeout;
    private final ConcurrentHashMap<String, Message<T>> messages = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Message<T>> dlq = new ConcurrentHashMap<>();

    public ReliableQueue(Duration visibilityTimeout) {
        this.visibilityTimeout = visibilityTimeout;
    }

    public void enqueue(String id, T data, int maxAttempts) {
        messages.put(id, new Message<>(id, data, maxAttempts));
    }

    public synchronized Message<T> dequeue() {
        Instant now = Instant.now();

        for (Message<T> msg : messages.values()) {
            if (now.isAfter(msg.visibleAfter) || now.equals(msg.visibleAfter)) {
                msg.attempts++;
                if (msg.attempts > msg.maxAttempts) {
                    dlq.put(msg.id, msg);
                    messages.remove(msg.id);
                    continue;
                }
                msg.visibleAfter = now.plus(visibilityTimeout);
                return msg;
            }
        }
        return null;
    }

    public void ack(String id) {
        messages.remove(id);
    }

    public void nack(String id) {
        Message<T> msg = messages.get(id);
        if (msg != null) {
            msg.visibleAfter = Instant.now();
        }
    }
}`,
      explanation:
        "Java ReliableQueue utilizing ConcurrentHashMap for high concurrency and synchronized dequeue for atomic message leasing.",
      keyDecisions: [
        "Instant-based timestamp arithmetic.",
        "Automatic DLQ routing on attempt threshold breach.",
      ],
      complexityNotes: "Thread-safe atomic message leasing.",
    },
  },

  edgeCases: [
    {
      scenario: "Task Duration Exceeding Visibility Timeout",
      consequence:
        "A task takes 45 seconds to process, but visibility timeout is 30 seconds. The queue marks the message visible again; a second worker starts processing it in parallel, causing duplicate execution.",
      solution:
        "Implement active 'Heartbeat Visibility Extension': while worker is processing, send an extend-lease call every 15 seconds to push visibleAfter forward.",
    },
    {
      scenario: "Poison Pill Crashing Worker Fleet",
      consequence:
        "A malformed message causes an unhandled panic/segmentation fault in worker. The message is re-queued, crashes another worker, and continues until all worker containers crash.",
      solution:
        "Enforce strict try/catch panic recovery around worker handlers and increment attempts counter before task execution.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Queue Lag Explosion (Backlog Accumulation)",
        description:
          "Arrival rate exceeds worker processing rate. Backlog grows to millions of messages, increasing processing delay from 1s to 5 hours.",
        mitigation:
          "Configure Horizontal Pod Autoscaler (HPA) driven by Queue Length (e.g. SQS ApproximateNumberOfMessagesVisible) rather than CPU utilization.",
      },
    ],
    scaling10x: [
      "Partition high-volume queues into sharded topics/virtual queues with parallel consumer groups.",
      "Switch from HTTP polling to long polling (20s wait) to eliminate empty poll CPU churn.",
      "Enforce prefetch limits on workers to prevent socket memory exhaustion.",
    ],
    concurrencyRaceConditions: [
      "Multiple workers claiming the exact same message simultaneously: Use atomic row locks (SKIP LOCKED in PostgreSQL / MySQL 8.0) or native broker locking.",
    ],
    observability: {
      metrics: [
        "queue_messages_visible_gauge{queue}",
        "queue_messages_in_flight_gauge{queue}",
        "queue_message_age_seconds (oldest message timestamp delta)",
        "queue_dlq_messages_total{queue}",
      ],
      logs: [
        "Structured log on every ACK and DLQ quarantine with correlation_id.",
      ],
      traces: [
        "Propagate W3C trace context inside message envelope metadata to trace end-to-end flow from producer to consumer.",
      ],
    },
    securityNotes: [
      "Encrypt message payloads at rest and in transit (KMS envelope encryption).",
    ],
  },

  tradeoffs: [
    {
      approach: "Standard Distributed Queue (SQS, RabbitMQ)",
      advantages: "High throughput; scales to millions of messages; automatic visibility timeouts.",
      disadvantages: "Best-effort ordering; at-least-once delivery (may deliver duplicates).",
      useWhen: "Standard async workloads where order is non-critical.",
    },
    {
      approach: "FIFO Queue (Strict Ordering)",
      advantages: "Guarantees exact first-in, first-out ordering; built-in deduplication.",
      disadvantages: "Lower throughput cap (e.g. 300 to 3,000 msgs/sec); head-of-line blocking.",
      useWhen: "Financial ledger transactions or state machines where sequence must never invert.",
    },
  ],

  furtherReading: [
    {
      title: "Enterprise Integration Patterns: Message Channel & Competing Consumers",
      type: "Book",
      authorOrOrg: "Gregor Hohpe, Bobby Woolf",
      description: "The foundational design patterns for message-driven architectures.",
    },
    {
      title: "Amazon SQS Under the Hood: Visibility Timeout Architecture",
      type: "Blog",
      authorOrOrg: "AWS Architecture",
      description: "How Amazon SQS achieves distributed leasing and fault recovery.",
    },
  ],
};
