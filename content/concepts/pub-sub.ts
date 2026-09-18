import { Concept } from "./types";

export const pubSub: Concept = {
  slug: "pub-sub",
  title: "Publish-Subscribe & Event Fan-Out",
  shortDescription:
    "Broadcast domain events to multiple independent subscribers without coupling publishers to consumer implementations or availability.",
  category: "Messaging",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Topics & Subscriptions",
    "Fan-Out Distribution",
    "Consumer Groups",
    "At-Least-Once Delivery",
    "Independent Offset Tracking",
    "Eventual Consistency",
  ],

  overview: {
    problemStatement:
      "When a core business event occurs (e.g. `OrderPlaced`), multiple downstream systems must react: Inventory must reserve stock, Billing must charge the customer, Shipping must create a label, Analytics must record the funnel, and Notification must send an email. If the Order service calls all these systems synchronously, it becomes tightly coupled to their network endpoints, latency accumulates linearly, and any downstream outage aborts the order.",
    whenToUse: [
      "Broadcasting 1-to-many domain events across organizational boundaries.",
      "Event-driven microservices architecture.",
      "Decoupling event producers from the knowledge of who consumes their events.",
      "Real-time analytics and telemetry aggregation.",
    ],
    whenNotToUse: [
      "Strict point-to-point worker task distribution (use Message Queues instead).",
      "Synchronous command execution where the caller needs an immediate return value.",
      "Ultra-low latency inter-thread messaging within a single process (use channels or event emitters).",
    ],
    coreInvariant:
      "Publishers publish to a logical topic without knowing subscriber identities; every active subscriber receives a private, isolated copy of each message delivered to the topic.",
  },

  whyItExists: {
    realWorldProblem:
      "An e-commerce order service synchronously calls the Fraud, Warehouse, Email, and Recommendation services. The Email service has a 3-second network pause. Because the calls are chained synchronously, checkout latency spikes to 4.2 seconds. Worse, when the Recommendation service throws a 500 error, the entire checkout transaction rolls back, losing revenue because a non-critical feature failed.",
    catastrophicScenario:
      "A banking platform processes account transfers. Instead of asynchronous pub/sub, the transfer service calls 12 downstream compliance, analytics, and marketing microservices in sequence. During peak month-end traffic, one marketing microservice deploys buggy code that opens 5,000 DB connections and hangs. The transfer service exhausts its thread pool waiting on the marketing service, shutting down real-world bank transfers across the entire country.",
    systemImpact: [
      "Severe runtime coupling between critical and non-critical services.",
      "Linear accumulation of network latencies across multiple downstream calls.",
      "Cascading outages when secondary consumer services experience downtime.",
      "Inability to onboard new microservices without modifying upstream producer code.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "In Pub/Sub, a Publisher emits an event to a named Topic. The publisher does not know and does not care what services are listening.",
      "The message broker maintains individual Subscriptions (or Consumer Groups) attached to the topic. When an event is published, the broker fans out the message: it duplicates or references the event into the private queue/offset of each registered subscription.",
      "Each subscription operates independently: Subscriber A (Billing) can process immediately, Subscriber B (Warehouse) can process in batches, and Subscriber C (Analytics) can lag by 10 minutes without impacting Subscriber A or the Publisher.",
      "In distributed event logs (like Apache Kafka or AWS Kinesis), messages are appended to immutable partitioned logs. Consumers maintain their own cursor/offset, enabling independent replay of historical events.",
    ],
    singleVsDistributed:
      "In-memory Pub/Sub (e.g. Node EventEmitter or Go channels) broadcasts to in-process memory pointers with no persistence; if a subscriber is slow or crashes, messages are lost. Distributed Pub/Sub (e.g. Google Cloud Pub/Sub, SNS/SQS, Kafka) persists events to replicated disks and guarantees delivery even if subscribers are completely offline.",
    semanticsAndGuarantees: [
      "At-least-once delivery: Broker ensures every subscriber receives the message at least once.",
      "Subscriber isolation: A crash or slow processing in Subscriber A never impacts Subscriber B.",
      "Zero producer blocking: Publisher acknowledges receipt in <5ms.",
    ],
    keyAlgorithms: [
      {
        name: "Fan-Out Broker Replication",
        description: "Broker clones incoming message to separate FIFO queues for every active subscription.",
        pros: "Complete isolation; subscribers can ACK/NACK independently.",
        cons: "Multiplies storage and network overhead proportionally to subscriber count.",
      },
      {
        name: "Partitioned Log with Offset Cursors",
        description: "Single immutable append-only disk log; subscribers maintain private offset pointers (Kafka style).",
        pros: "O(1) broker disk write overhead regardless of subscriber count; allows time-travel replay.",
        cons: "Subscribers cannot delete individual messages; retention is time-based.",
      },
      {
        name: "Topic Filtering / Attribute Matching",
        description: "Subscribers register SQL-like filter expressions (e.g. `event_type = 'fraud'`). Broker only routes matching events.",
        pros: "Eliminates network transmission of unwanted messages to subscribers.",
        cons: "Slight broker CPU evaluation overhead per message.",
      },
    ],
  },

  visualizerType: "pub-sub",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Model Topics & Subscriptions",
      summary: "Create distinct data structures for topics and consumer registrations.",
      explanation:
        "A Topic represents a logical stream of events. A Subscription represents an independent consumer stream with its own queue and configuration.",
      pseudocode: `struct Subscription {
  id: string
  queue: Queue<Message>
  filterAttributes: Map<string, string>
}
struct Topic {
  name: string
  subscriptions: List<Subscription>
}`,
      considerations: [
        "Support wildcards or hierarchical naming (e.g., `orders.created`, `orders.*`).",
      ],
    },
    {
      stepNumber: 2,
      title: "Implement Publisher Ingress",
      summary: "Accept message from producer, assign metadata, and acknowledge.",
      explanation:
        "Assign message ID (UUID), timestamp, and publish to topic.",
      considerations: [
        "Validate message schema against an Avro or JSON Schema registry.",
      ],
    },
    {
      stepNumber: 3,
      title: "Execute Fan-Out Routing Logic",
      summary: "Iterate through registered subscriptions and push copies to each.",
      explanation:
        "When an event is published, loop through all subscriptions registered to that topic. Check optional attribute filters, and enqueue a copy into the subscription's buffer.",
      pseudocode: `function publish(topicName, message):
  topic = getTopic(topicName)
  for sub in topic.subscriptions:
    if matchesFilter(sub, message):
      sub.queue.enqueue(clone(message))`,
      considerations: [
        "Fan-out should be asynchronous so one slow subscriber queue doesn't block publishing.",
      ],
    },
    {
      stepNumber: 4,
      title: "Enable Consumer Group Load Balancing",
      summary: "Allow multiple worker instances to share a single subscription.",
      explanation:
        "When a service scales to 5 pods, they shouldn't all process every event. They form a single Consumer Group, and the subscription distributes events across them in round-robin fashion.",
      considerations: [
        "Different services have different consumer groups; pods within the same service share a consumer group.",
      ],
    },
    {
      stepNumber: 5,
      title: "Track Independent Subscriber ACKs & Offsets",
      summary: "Manage progress independently per subscription.",
      explanation:
        "If Subscription A ACKs message #100, message #100 is completed for A. Subscription B can still be processing message #95.",
      considerations: [
        "Ensure dropped consumer connections cause unacknowledged messages to be redelivered.",
      ],
    },
    {
      stepNumber: 6,
      title: "Handle Subscriber Deadlines & Backpressure",
      summary: "Protect subscriber memory from overwhelming event volumes.",
      explanation:
        "If a subscriber is processing slowly, bound its inbound buffer. When buffer is full, pause network delivery or drop according to policy.",
      considerations: [
        "Alert when subscriber lag (distance between newest message and current offset) grows continuously.",
      ],
    },
    {
      stepNumber: 7,
      title: "Support Idempotent Consumption",
      summary: "Ensure consumers safely handle duplicate deliveries.",
      explanation:
        "Because distributed brokers guarantee at-least-once delivery, subscribers must combine message processing with an idempotency mechanism.",
      considerations: [
        "Include unique event ID in message payload for deduplication.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "pubsub.go",
      code: `package pubsub

import (
	"context"
	"sync"
	"time"
)

type Event struct {
	ID        string
	Topic     string
	Payload   []byte
	Timestamp time.Time
}

type Subscriber struct {
	ID      string
	Channel chan Event
}

type Broker struct {
	mu     sync.RWMutex
	topics map[string]map[string]*Subscriber
}

func NewBroker() *Broker {
	return &Broker{
		topics: make(map[string]map[string]*Subscriber),
	}
}

// Subscribe registers a subscriber to a topic with a buffered channel.
func (b *Broker) Subscribe(topic, subscriberID string, bufferSize int) *Subscriber {
	b.mu.Lock()
	defer b.mu.Unlock()

	if _, ok := b.topics[topic]; !ok {
		b.topics[topic] = make(map[string]*Subscriber)
	}

	sub := &Subscriber{
		ID:      subscriberID,
		Channel: make(chan Event, bufferSize),
	}
	b.topics[topic][subscriberID] = sub
	return sub
}

// Publish fans out an event to all subscribers registered on the topic.
func (b *Broker) Publish(ctx context.Context, topic string, payload []byte) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	subscribers, exists := b.topics[topic]
	if !exists {
		return
	}

	event := Event{
		ID:        time.Now().Format("20060102150405.000000"),
		Topic:     topic,
		Payload:   payload,
		Timestamp: time.Now(),
	}

	for _, sub := range subscribers {
		select {
		case sub.Channel <- event:
		case <-ctx.Done():
			return
		default:
			// Non-blocking drop or backpressure if subscriber buffer is full
		}
	}
}

// Unsubscribe safely cleans up the subscription channel.
func (b *Broker) Unsubscribe(topic, subscriberID string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if subs, ok := b.topics[topic]; ok {
		if sub, ok := subs[subscriberID]; ok {
			close(sub.Channel)
			delete(subs, subscriberID)
		}
	}
}`,
      explanation:
        "Thread-safe Go Pub/Sub broker using sync.RWMutex and buffered Go channels to broadcast events to isolated subscribers with non-blocking fan-out protection.",
      keyDecisions: [
        "sync.RWMutex allows parallel reads during high-frequency publish operations.",
        "Select with default clause prevents a slow subscriber channel from blocking the broker.",
      ],
      complexityNotes: "Publish time O(S) where S is the number of topic subscribers.",
    },

    typescript: {
      filename: "PubSubBroker.ts",
      code: `export interface PubSubEvent<T> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
}

export type EventHandler<T> = (event: PubSubEvent<T>) => Promise<void> | void;

export class PubSubBroker {
  private subscriptions = new Map<string, Map<string, EventHandler<any>>>();

  public subscribe<T>(
    topic: string,
    subscriberId: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
    }

    const topicSubs = this.subscriptions.get(topic)!;
    topicSubs.set(subscriberId, handler);

    // Return unsubscribe callback
    return () => {
      topicSubs.delete(subscriberId);
      if (topicSubs.size === 0) {
        this.subscriptions.delete(topic);
      }
    };
  }

  public async publish<T>(topic: string, payload: T): Promise<void> {
    const topicSubs = this.subscriptions.get(topic);
    if (!topicSubs || topicSubs.size === 0) {
      return;
    }

    const event: PubSubEvent<T> = {
      id: crypto.randomUUID(),
      topic,
      payload,
      timestamp: Date.now(),
    };

    // Fan-out asynchronously across all subscriber handlers
    const dispatches = Array.from(topicSubs.values()).map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(\`Subscriber handler failed on topic \${topic}:\`, err);
      }
    });

    await Promise.allSettled(dispatches);
  }
}`,
      explanation:
        "Async TypeScript PubSub broker with independent subscriber handlers and Promise.allSettled fan-out to guarantee that an exception in one subscriber never halts others.",
      keyDecisions: [
        "Promise.allSettled ensures error isolation across subscribers.",
        "Returns an unsubscribe teardown function for clean resource lifecycles.",
      ],
      complexityNotes: "O(S) concurrent dispatch.",
    },

    python: {
      filename: "pubsub.py",
      code: `import threading
import uuid
import time
from typing import Callable, Dict, Any, List

class Event:
    def __init__(self, topic: str, payload: Any):
        self.id = str(uuid.uuid4())
        self.topic = topic
        self.payload = payload
        self.timestamp = time.time()

class PubSubBroker:
    def __init__(self):
        self._lock = threading.Lock()
        self._topics: Dict[str, Dict[str, Callable[[Event], None]]] = {}

    def subscribe(self, topic: str, sub_id: str, handler: Callable[[Event], None]):
        with self._lock:
            if topic not in self._topics:
                self._topics[topic] = {}
            self._topics[topic][sub_id] = handler

    def publish(self, topic: str, payload: Any):
        with self._lock:
            handlers = list(self._topics.get(topic, {}).values())

        event = Event(topic, payload)

        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"Error in subscriber handler for topic {topic}: {e}")

    def unsubscribe(self, topic: str, sub_id: str):
        with self._lock:
            if topic in self._topics:
                self._topics[topic].pop(sub_id, None)`,
      explanation:
        "Python implementation with thread-safe subscription registration and isolated error trapping during synchronous fan-out.",
      keyDecisions: [
        "Snapshot list of handlers inside lock to execute handlers outside the lock.",
        "Catches exceptions per handler to isolate subscriber failures.",
      ],
      complexityNotes: "O(S) subscriber iteration.",
    },

    java: {
      filename: "PubSubBroker.java",
      code: `package com.engineeringlab.pubsub;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public class PubSubBroker {
    public record Event<T>(String id, String topic, T payload, Instant timestamp) {}

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<Consumer<Event<Object>>>> topics = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    @SuppressWarnings("unchecked")
    public <T> void subscribe(String topic, Consumer<Event<T>> handler) {
        topics.computeIfAbsent(topic, k -> new CopyOnWriteArrayList<>())
              .add((Consumer<Event<Object>>) (Consumer<?>) handler);
    }

    public <T> void publish(String topic, T payload) {
        var handlers = topics.get(topic);
        if (handlers == null || handlers.isEmpty()) return;

        Event<Object> event = new Event<>(UUID.randomUUID().toString(), topic, (Object) payload, Instant.now());

        for (var handler : handlers) {
            executor.submit(() -> {
                try {
                    handler.accept(event);
                } catch (Exception ex) {
                    System.err.println("Subscriber failed for topic " + topic + ": " + ex.getMessage());
                }
            });
        }
    }
}`,
      explanation:
        "Modern Java PubSub broker utilizing Java 21 Virtual Threads (Loom) for ultra-lightweight asynchronous fan-out across thousands of parallel subscribers.",
      keyDecisions: [
        "CopyOnWriteArrayList provides lock-free subscriber iteration during high-frequency publish events.",
        "Virtual threads eliminate thread pool exhaustion during concurrent fan-out.",
      ],
      complexityNotes: "Sub-millisecond virtual thread dispatch.",
    },
  },

  edgeCases: [
    {
      scenario: "Slow Subscriber Lagging Behind Retention Window",
      consequence:
        "In a log-based broker (Kafka), Subscriber C processes so slowly that the broker's 7-day disk retention policy purges unread segments, permanently dropping messages.",
      solution:
        "Monitor consumer group lag metrics and alert when lag exceeds 50% of the retention buffer; auto-scale consumer pods.",
    },
    {
      scenario: "Fan-Out Explosion Overwhelming Network Egress",
      consequence:
        "A large 1MB video event is published to a topic with 5,000 subscribers. Fan-out requires 5GB of network transmission instantly, saturating the broker's NIC.",
      solution:
        "Use the Claim-Check Pattern: store the 1MB payload in S3/Blob storage, and broadcast a lightweight 200-byte event containing the payload URI.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Duplicate Message Storm",
        description:
          "Network drops subscriber ACK packet. Broker assumes subscriber died and redelivers event to another pod, executing side effects twice.",
        mitigation:
          "All subscribers must be strictly idempotent using event ID deduplication.",
      },
    ],
    scaling10x: [
      "Partition topics across multiple broker nodes (e.g. 32 partitions per topic) to allow parallel consumer scaling.",
      "Batch events on publisher side before network transit (e.g. transmit 500 events per TCP frame).",
    ],
    concurrencyRaceConditions: [
      "Dynamic subscription changes during active publishing: Handled cleanly by Copy-On-Write collections or RWMutex snapshotting.",
    ],
    observability: {
      metrics: [
        "pubsub_events_published_total{topic}",
        "pubsub_events_delivered_total{topic, subscriber}",
        "pubsub_consumer_lag_records{topic, subscriber}",
      ],
      logs: [
        "Log event ID, topic, and fan-out count at publisher egress.",
      ],
      traces: [
        "Propagate trace context via event metadata headers across the event bus.",
      ],
    },
    securityNotes: [
      "Enforce topic-level IAM authorization policies so untrusted services cannot subscribe to sensitive security or financial topics.",
    ],
  },

  tradeoffs: [
    {
      approach: "Broker-Duplicated Fan-Out (RabbitMQ / SQS)",
      advantages: "Each subscriber has an isolated queue; messages can be ACKed or deleted individually.",
      disadvantages: "Storage and network multiply linearly with subscriber count.",
      useWhen: "Independent worker pools that need granular task acknowledgement and retries.",
    },
    {
      approach: "Partitioned Distributed Log (Kafka / Kinesis)",
      advantages: "Single disk write for all subscribers; massive throughput (millions/sec); historical replay.",
      disadvantages: "Cannot delete single messages; head-of-line blocking if a partition stalls.",
      useWhen: "High-throughput event streaming, metrics, clickstreams, and CQRS architectures.",
    },
  ],

  furtherReading: [
    {
      title: "Kafka: A Distributed Messaging System for Log Processing",
      type: "Paper",
      authorOrOrg: "Jay Kreps et al. (LinkedIn)",
      description: "The seminal paper establishing the partitioned append-only log architecture.",
      url: "https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf",
    },
  ],
};
