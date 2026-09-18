import { Concept } from "./types";

export const replicationQuorum: Concept = {
  slug: "replication-quorum",
  title: "Replication & Quorum Consistency",
  shortDescription:
    "Replicate data across fault-tolerant nodes and balance consistency versus latency using Write (W) and Read (R) quorums.",
  category: "Data",
  difficulty: "Advanced",
  estimatedTime: "~35 min",
  topics: [
    "Primary-Replica Topologies",
    "Synchronous vs Asynchronous Replication",
    "Replication Lag & Stale Reads",
    "Quorum Equation (W + R > N)",
    "Read Repair & Anti-Entropy",
    "Split-Brain Prevention",
  ],

  overview: {
    problemStatement:
      "Storing data on a single physical machine creates a catastrophic Single Point of Failure (SPOF) and hard throughput limits. To survive hardware crashes and scale read traffic, data must be replicated across multiple machines. However, distributing writes across multiple nodes over imperfect networks introduces consistency dilemmas: when is a write considered safe? And how do we prevent readers from seeing stale or conflicting data?",
    whenToUse: [
      "High-availability distributed databases (DynamoDB, Cassandra, MongoDB, CockroachDB).",
      "Mission-critical datasets that must survive physical data center or availability zone loss.",
      "Read-heavy architectures requiring read replicas across geographical regions.",
      "Leaderless distributed architectures requiring configurable consistency levels.",
    ],
    whenNotToUse: [
      "Ephemeral or cache data that can easily be reconstructed on loss.",
      "Single-instance embedded applications (SQLite) with zero high-availability requirements.",
      "Environments where network round-trip overhead across regions violates strict sub-millisecond SLAs.",
    ],
    coreInvariant:
      "For a cluster of N replica nodes, strong read-after-write consistency (strict serializability / linearizability) is mathematically guaranteed if and only if: W + R > N, where W is the write acknowledgement quorum and R is the read quorum.",
  },

  whyItExists: {
    realWorldProblem:
      "A database replicates asynchronously to 3 read replicas. A user changes their password on the Primary and immediately navigates to /login. Their login request hits Replica #3, which is suffering from 400ms of replication lag. Replica #3 compares the password against the old hash and rejects the user with 'Invalid Password'. The user gets locked out because the read hit an un-replicated replica.",
    catastrophicScenario:
      "A distributed cluster of 5 nodes has no quorum rules (W=1). A network partition splits the cluster into two factions (3 nodes in DC East, 2 nodes in DC West). Both sides accept writes from local clients, updating the same account balance in contradictory directions. When the partition heals, the databases have conflicting history with divergent state machines, requiring complex manual reconciliation and causing permanent data loss.",
    systemImpact: [
      "Inconsistent reads (dirty reads, stale reads, read-skew anomalies).",
      "Silent data overwrite when conflicting partitioned writes collide.",
      "Permanent data loss if the primary crashes before replicating async writes.",
      "Unbounded replication lag during high write spikes.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "In Primary-Replica (Leader-Follower) architectures, all write operations are routed to the designated Primary node. The Primary commits the transaction and propagates replication logs to Replicas.",
      "In Synchronous Replication, the Primary waits for confirmation from replicas before acknowledging the client. This guarantees zero data loss (RPO = 0) on primary failure, but increases write latency to match the slowest replica.",
      "In Asynchronous Replication, the Primary acknowledges the client immediately after writing locally. Writes replicate in the background. Write latency is ultra-fast, but any un-replicated writes are permanently lost if the Primary crashes.",
      "In Leaderless Quorum systems (Amazon Dynamo, Apache Cassandra), any node can coordinate a read or write. A write is sent to all N replicas and acknowledged once W nodes confirm. A read queries R replicas, retrieves version timestamps/vector clocks, and returns the newest value.",
      "By setting W + R > N (the Pigeonhole Principle), the set of nodes written to and the set of nodes read from MUST overlap by at least one node. That overlapping node is guaranteed to return the latest version.",
    ],
    singleVsDistributed:
      "Single-node databases offer immediate ACID consistency at the cost of zero fault tolerance. Replicated clusters trade write latency and coordination overhead for high availability and disaster resilience.",
    semanticsAndGuarantees: [
      "Strong Consistency (W + R > N): Guarantees reading the most recently written data.",
      "Eventual Consistency (W + R <= N): Low write latency and high availability; readers may temporarily observe stale data.",
      "Monotonic Read Consistency: Prevents a user from observing time move backward across repeated queries.",
    ],
    keyAlgorithms: [
      {
        name: "Quorum Intersection (W + R > N)",
        description: "Enforces that the write quorum W and read quorum R overlap on at least one replica node in an N-node cluster.",
        pros: "Guarantees strong read consistency without global distributed locks.",
        cons: "Requires parallel network requests to multiple nodes on both read and write.",
      },
      {
        name: "Read Repair",
        description: "When a read quorum detects that one replica returned an older version than the quorum winner, the coordinator asynchronously pushes the newest version to the stale replica.",
        pros: "Self-healing data integrity during normal read operations.",
        cons: "Adds minor background write overhead during read paths.",
      },
      {
        name: "Raft / Paxos Consensus",
        description: "Leader-based consensus protocol where state transitions are committed to a replicated log only after confirmation from a majority quorum (N/2 + 1).",
        pros: "Guarantees strict linearizability, leader election, and split-brain immunity.",
        cons: "Writes must wait on majority network round-trips; cluster must maintain odd node counts (3, 5, 7).",
      },
    ],
  },

  visualizerType: "replication-quorum",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Define Cluster Topology & Node Count (N)",
      summary: "Determine replication factor N (typically 3 or 5).",
      explanation:
        "Select an odd number of replicas (e.g. N=3 allows surviving 1 node crash; N=5 survives 2 node crashes while maintaining majority quorum).",
      pseudocode: `N = 3 // Total replicas
W = 2 // Write quorum (majority)
R = 2 // Read quorum (majority)
// W + R = 4 > 3 -> Strong Consistency`,
      considerations: [
        "Distribute replicas across different physical Availability Zones (AZs) or racks.",
      ],
    },
    {
      stepNumber: 2,
      title: "Model Versioned Data Envelope",
      summary: "Attach monotonic timestamps or vector clocks to every value.",
      explanation:
        "Replication requires version comparison. Wrap values with: `value`, `version` (int64 monotonic counter), and `timestamp`.",
      pseudocode: `struct VersionedRecord {
  key: string
  value: string
  version: int64
  timestamp: int64
}`,
      considerations: [
        "Monotonic version numbers prevent wall-clock drift issues during conflict resolution.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Parallel Quorum Write Dispatch",
      summary: "Broadcast write to all N nodes and await W acknowledgements.",
      explanation:
        "When a write arrives, the coordinator sends parallel network requests to all N replicas. As soon as W replicas respond with success, acknowledge the client immediately.",
      considerations: [
        "Remaining (N - W) replicas continue writing asynchronously in background.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Parallel Quorum Read & Reconciliation",
      summary: "Query R replicas, compare versions, and return latest value.",
      explanation:
        "Coordinator queries R replicas. Once R responses arrive, pick the record with highest `version`. Return this winner to the client.",
      pseudocode: `function readQuorum(key, R):
  responses = queryParallel(replicas, key, count=R)
  winner = maxBy(responses, record => record.version)
  return winner`,
      considerations: [
        "If different nodes return conflicting versions at the same timestamp, use deterministic tie-breaking (e.g. highest node ID).",
      ],
    },
    {
      stepNumber: 5,
      title: "Implement Asynchronous Read Repair",
      summary: "Heal stale replicas discovered during read queries.",
      explanation:
        "If during read quorum, Node 1 returned version 10 and Node 2 returned version 9, fire an async background update sending version 10 to Node 2.",
      considerations: [
        "Read repair ensures eventual consistency without running full cluster scans.",
      ],
    },
    {
      stepNumber: 6,
      title: "Handle Node Downtime & Partial Failures",
      summary: "Ensure cluster continues operating when N - W nodes crash.",
      explanation:
        "With N=3 and W=2, if 1 node dies, write requests still receive 2 ACKs and succeed seamlessly. If 2 nodes die, W=2 cannot be satisfied and writes fail-fast.",
      considerations: [
        "Sloppy Quorum / Hinted Handoff can temporarily store writes on healthy non-designated nodes.",
      ],
    },
    {
      stepNumber: 7,
      title: "Prevent Split-Brain via Strict Majority",
      summary: "Ensure partitioned networks cannot elect two independent leaders.",
      explanation:
        "Require majority quorum (N/2 + 1) for all write decisions. In a 5-node cluster split into 3 and 2, only the 3-node partition can form a majority and make progress.",
      considerations: [
        "The minority partition (2 nodes) must reject writes to prevent state divergence.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "quorum.go",
      code: `package quorum

import (
	"context"
	"errors"
	"sync"
	"time"
)

var (
	ErrQuorumFailed = errors.New("failed to satisfy quorum threshold")
)

type Record struct {
	Value     string
	Version   int64
	Timestamp time.Time
}

type Node struct {
	ID   string
	mu   sync.RWMutex
	data map[string]Record
}

func NewNode(id string) *Node {
	return &Node{
		ID:   id,
		data: make(map[string]Record),
	}
}

func (n *Node) Write(key, value string, version int64) {
	n.mu.Lock()
	defer n.mu.Unlock()
	current, exists := n.data[key]
	if !exists || version > current.Version {
		n.data[key] = Record{
			Value:     value,
			Version:   version,
			Timestamp: time.Now(),
		}
	}
}

func (n *Node) Read(key string) (Record, bool) {
	n.mu.RLock()
	defer n.mu.RUnlock()
	rec, ok := n.data[key]
	return rec, ok
}

type Coordinator struct {
	nodes []*Node
	N     int
	W     int
	R     int
}

func NewCoordinator(nodes []*Node, w, r int) *Coordinator {
	return &Coordinator{
		nodes: nodes,
		N:     len(nodes),
		W:     w,
		R:     r,
	}
}

// WriteQuorum writes to all N nodes and waits until W nodes acknowledge.
func (c *Coordinator) WriteQuorum(ctx context.Context, key, value string, version int64) error {
	ackCh := make(chan struct{}, c.N)
	errCh := make(chan error, c.N)

	for _, node := range c.nodes {
		go func(n *Node) {
			n.Write(key, value, version)
			ackCh <- struct{}{}
		}(node)
	}

	acks := 0
	for i := 0; i < c.N; i++ {
		select {
		case <-ackCh:
			acks++
			if acks >= c.W {
				return nil // Quorum satisfied
			}
		case err := <-errCh:
			_ = err
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return ErrQuorumFailed
}

// ReadQuorum queries R nodes, reconciles version conflict, and triggers Read Repair.
func (c *Coordinator) ReadQuorum(ctx context.Context, key string) (Record, error) {
	type result struct {
		node *Node
		rec  Record
		ok   bool
	}
	resCh := make(chan result, c.N)

	for _, node := range c.nodes {
		go func(n *Node) {
			rec, ok := n.Read(key)
			resCh <- result{node: n, rec: rec, ok: ok}
		}(node)
	}

	var latest Record
	var winnerFound bool
	var staleNodes []*Node
	responses := 0

	for i := 0; i < c.N; i++ {
		select {
		case res := <-resCh:
			responses++
			if res.ok {
				if !winnerFound || res.rec.Version > latest.Version {
					latest = res.rec
					winnerFound = true
				} else if res.rec.Version < latest.Version {
					staleNodes = append(staleNodes, res.node)
				}
			}

			if responses >= c.R && winnerFound {
				// Asynchronous Read Repair for stale nodes
				for _, staleNode := range staleNodes {
					go staleNode.Write(key, latest.Value, latest.Version)
				}
				return latest, nil
			}
		case <-ctx.Done():
			return Record{}, ctx.Err()
		}
	}

	if winnerFound {
		return latest, nil
	}
	return Record{}, ErrQuorumFailed
}`,
      explanation:
        "Production Go quorum coordinator managing parallel write dispatch with early W-acknowledgement return, parallel read quorum with version reconciliation, and background Read Repair for stale nodes.",
      keyDecisions: [
        "Channel coordination returns immediately once W or R threshold is achieved without waiting on remaining slow nodes.",
        "Asynchronous read repair silently fixes stale nodes discovered during read queries.",
      ],
      complexityNotes: "Bounded by the latency of the W-th fastest replica.",
    },

    typescript: {
      filename: "QuorumCoordinator.ts",
      code: `export interface VersionedData<T> {
  value: T;
  version: number;
  timestamp: number;
}

export class ReplicaNode<T> {
  constructor(
    public readonly id: string,
    private store = new Map<string, VersionedData<T>>()
  ) {}

  public async write(key: string, value: T, version: number): Promise<boolean> {
    const current = this.store.get(key);
    if (!current || version > current.version) {
      this.store.set(key, { value, version, timestamp: Date.now() });
    }
    return true;
  }

  public async read(key: string): Promise<VersionedData<T> | null> {
    return this.store.get(key) ?? null;
  }
}

export class QuorumCoordinator<T> {
  constructor(
    private readonly nodes: ReplicaNode<T>[],
    private readonly W: number, // Write Quorum
    private readonly R: number  // Read Quorum
  ) {}

  public async write(key: string, value: T, version: number): Promise<boolean> {
    // Parallel writes across all nodes
    const writePromises = this.nodes.map((node) => node.write(key, value, version));
    let acks = 0;

    return new Promise((resolve, reject) => {
      let resolved = false;
      let settled = 0;

      writePromises.forEach((p) => {
        p.then(() => {
          acks++;
          if (acks >= this.W && !resolved) {
            resolved = true;
            resolve(true);
          }
        }).finally(() => {
          settled++;
          if (settled === this.nodes.length && !resolved) {
            reject(new Error("Write Quorum failed: insufficient ACKs"));
          }
        });
      });
    });
  }

  public async read(key: string): Promise<VersionedData<T>> {
    const readPromises = this.nodes.map(async (node) => ({
      node,
      data: await node.read(key),
    }));

    const results: { node: ReplicaNode<T>; data: VersionedData<T> | null }[] = [];

    return new Promise((resolve, reject) => {
      let resolved = false;

      readPromises.forEach((p) => {
        p.then((res) => {
          results.push(res);
          if (results.length >= this.R && !resolved) {
            const valid = results.filter((r) => r.data !== null);
            if (valid.length === 0) {
              resolved = true;
              reject(new Error("Key not found"));
              return;
            }

            // Pick latest version
            valid.sort((a, b) => b.data!.version - a.data!.version);
            const winner = valid[0].data!;

            // Read Repair stale nodes asynchronously
            valid.forEach((r) => {
              if (r.data!.version < winner.version) {
                r.node.write(key, winner.value, winner.version);
              }
            });

            resolved = true;
            resolve(winner);
          }
        });
      });
    });
  }
}`,
      explanation:
        "TypeScript implementation handling asynchronous Promise race conditions for quorum fulfillment and background read repair.",
      keyDecisions: [
        "Resolves early as soon as W write ACKs or R read responses arrive.",
        "Triggers asynchronous write repair on stale nodes.",
      ],
      complexityNotes: "Fast-path execution bounded by the R-th fastest promise.",
    },

    python: {
      filename: "quorum_replication.py",
      code: `import time
from typing import Dict, List, Optional, Tuple, Any

class Record:
    def __init__(self, value: Any, version: int):
        self.value = value
        self.version = version
        self.timestamp = time.time()

class ReplicaNode:
    def __init__(self, node_id: str):
        self.node_id = node_id
        self._data: Dict[str, Record] = {}

    def write(self, key: str, value: Any, version: int) -> bool:
        current = self._data.get(key)
        if current is None or version > current.version:
            self._data[key] = Record(value, version)
        return True

    def read(self, key: str) -> Optional[Record]:
        return self._data.get(key)

class QuorumCoordinator:
    def __init__(self, nodes: List[ReplicaNode], w: int, r: int):
        self.nodes = nodes
        self.N = len(nodes)
        self.W = w
        self.R = r

    def write(self, key: str, value: Any, version: int) -> bool:
        acks = 0
        for node in self.nodes:
            if node.write(key, value, version):
                acks += 1
                if acks >= self.W:
                    return True
        return False

    def read(self, key: str) -> Optional[Record]:
        responses = []
        for node in self.nodes:
            rec = node.read(key)
            if rec:
                responses.append((node, rec))
            if len(responses) >= self.R:
                break

        if not responses:
            return None

        # Sort by version descending
        responses.sort(key=lambda item: item[1].version, reverse=True)
        winner_node, winner_rec = responses[0]

        # Read Repair
        for node, rec in responses[1:]:
            if rec.version < winner_rec.version:
                node.write(key, winner_rec.value, winner_rec.version)

        return winner_rec`,
      explanation:
        "Python quorum coordinator demonstrating versioned records, quorum thresholds, and read-repair synchronization.",
      keyDecisions: [
        "Simple version ordering selects authoritative record.",
        "Automatic background update for stale nodes.",
      ],
      complexityNotes: "O(R) read sorting; minimal overhead.",
    },

    java: {
      filename: "QuorumCluster.java",
      code: `package com.engineeringlab.quorum;

import java.util.*;
import java.util.concurrent.*;

public class QuorumCluster<T> {
    public record VersionedData<T>(T value, long version, long timestamp) {}

    public static class Node<T> {
        public final String id;
        private final Map<String, VersionedData<T>> store = new ConcurrentHashMap<>();

        public Node(String id) { this.id = id; }

        public synchronized void write(String key, T value, long version) {
            VersionedData<T> curr = store.get(key);
            if (curr == null || version > curr.version) {
                store.put(key, new VersionedData<>(value, version, System.currentTimeMillis()));
            }
        }

        public VersionedData<T> read(String key) {
            return store.get(key);
        }
    }

    private final List<Node<T>> nodes;
    private final int W;
    private final int R;
    private final ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();

    public QuorumCluster(List<Node<T>> nodes, int w, int r) {
        this.nodes = nodes;
        this.W = w;
        this.R = r;
    }

    public boolean write(String key, T value, long version) throws Exception {
        CountDownLatch latch = new CountDownLatch(W);

        for (Node<T> node : nodes) {
            pool.submit(() -> {
                node.write(key, value, version);
                latch.countDown();
            });
        }

        return latch.await(2, TimeUnit.SECONDS);
    }

    public VersionedData<T> read(String key) throws Exception {
        List<VersionedData<T>> results = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch latch = new CountDownLatch(R);

        for (Node<T> node : nodes) {
            pool.submit(() -> {
                VersionedData<T> data = node.read(key);
                if (data != null) {
                    results.add(data);
                    latch.countDown();
                }
            });
        }

        if (!latch.await(2, TimeUnit.SECONDS) || results.isEmpty()) {
            throw new NoSuchElementException("Read quorum failed for key: " + key);
        }

        results.sort((a, b) -> Long.compare(b.version(), a.version()));
        return results.get(0);
    }
}`,
      explanation:
        "Java implementation leveraging CountDownLatch and Java 21 Virtual Threads to await write and read quorums with high throughput.",
      keyDecisions: [
        "CountDownLatch(W) unblocks as soon as the W-th node acknowledges.",
        "Virtual threads execute parallel node RPCs without thread exhaustion.",
      ],
      complexityNotes: "Thread-safe concurrent execution.",
    },
  },

  edgeCases: [
    {
      scenario: "Network Partition (Split-Brain Cluster)",
      consequence:
        "A 5-node cluster splits into two partitions: Node {1, 2} in Region A and Node {3, 4, 5} in Region B. If W=2, both sides could accept contradictory writes.",
      solution:
        "Enforce strict Majority Quorum: W >= N/2 + 1 (W=3 for N=5). Region A (2 nodes) cannot reach quorum and rejects writes, preserving consistency.",
    },
    {
      scenario: "Silent Write Rollback After Client ACK",
      consequence:
        "Client receives write ACK from 2 nodes (W=2), but before data is committed to disk, both nodes experience power failure. The 3rd unwritten node survives.",
      solution:
        "Use Write-Ahead Logging (WAL) with fsync before sending network ACKs, or increase W to match total surviving node requirements.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Replication Lag Avalanche",
        description:
          "High write volume causes replicas to fall minutes behind the primary. Read queries hitting async replicas return drastically outdated data.",
        mitigation:
          "Track heartbeat replication lag; automatically drop replicas from the active read pool if lag exceeds 500ms.",
      },
    ],
    scaling10x: [
      "Combine Consistent Hashing ring partitioning with Quorum Replication (e.g. Cassandra / Dynamo model where each key replicates to N consecutive nodes on the ring).",
      "Deploy Local Quorum (LOCAL_QUORUM in Cassandra) to satisfy W and R within the local datacenter, reducing cross-datacenter WAN latency.",
    ],
    concurrencyRaceConditions: [
      "Concurrent writes with equal timestamps: Enforce vector clocks or deterministic Lamport timestamps to resolve concurrent write conflicts.",
    ],
    observability: {
      metrics: [
        "replication_lag_seconds{replica_id}",
        "quorum_write_latency_seconds (p50, p99)",
        "quorum_read_repair_events_total",
      ],
      logs: [
        "WARN log whenever a read repair event corrects a stale replica version.",
      ],
      traces: [
        "Trace span tracking parallel fan-out RPCs to each replica node.",
      ],
    },
    securityNotes: [
      "Enable mutual TLS (mTLS) with certificate rotation for all node-to-node replication traffic.",
    ],
  },

  tradeoffs: [
    {
      approach: "Strong Quorum (W + R > N)",
      advantages: "Guarantees strong read-after-write consistency; no stale reads.",
      disadvantages: "Higher latency; requires parallel network round-trips for every read and write.",
      useWhen: "Financial accounts, inventory levels, critical user permissions.",
    },
    {
      approach: "Eventual Quorum (W=1, R=1)",
      advantages: "Minimal latency (returns after fastest node); maximum availability.",
      disadvantages: "Readers frequently observe stale data; conflicts must be resolved later.",
      useWhen: "Social media feeds, view counters, non-critical metrics.",
    },
    {
      approach: "Primary-Replica (Sync Master, Async Replicas)",
      advantages: "Simple architecture; read scaling via read replicas; single source of truth.",
      disadvantages: "Failover downtime if Primary crashes; async replica read lag.",
      useWhen: "Traditional relational databases (PostgreSQL, MySQL).",
    },
  ],

  furtherReading: [
    {
      title: "Dynamo: Amazon's Highly Available Key-value Store (Section 4.5: Vector Clocks and Quorums)",
      type: "Paper",
      authorOrOrg: "DeCandia et al. (Amazon)",
      description: "The definitive paper introducing configurable W, R, N quorums and hinted handoff.",
      url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
    },
    {
      title: "Designing Data-Intensive Applications (Chapter 5: Replication)",
      type: "Book",
      authorOrOrg: "Martin Kleppmann",
      description: "Comprehensive guide to leader-based vs leaderless replication and quorum mathematics.",
    },
  ],
};
