import { Concept } from "./types";

export const distributedLock: Concept = {
  slug: "distributed-lock",
  title: "Distributed Locks & Fencing Tokens",
  shortDescription:
    "Coordinate mutual exclusion across independent processes and survive node crashes, network pauses, and GC stalls using leases and monotonic fencing tokens.",
  category: "Distributed Systems",
  difficulty: "Advanced",
  estimatedTime: "~30 min",
  topics: [
    "Mutual Exclusion",
    "Leases & TTL Expiration",
    "Atomic Acquisition (SET NX PX)",
    "Safe Release (Lua Verification)",
    "The Martin Kleppmann GC Pause Dilemma",
    "Monotonic Fencing Tokens",
  ],

  overview: {
    problemStatement:
      "When multiple autonomous server processes must coordinate access to a shared resource (such as executing a daily billing batch, migrating database schemas, or modifying a shared cloud file), local mutexes are useless because processes run in separate memory spaces on distinct physical servers. Without distributed mutual exclusion, multiple workers execute concurrently, leading to data corruption and race conditions.",
    whenToUse: [
      "Preventing duplicate scheduled batch jobs across autoscaled cron worker fleets.",
      "Leader election for single-writer distributed topologies.",
      "Coordinating serialized access to legacy third-party non-transactional resources.",
      "Guarding distributed state mutations where optimistic locking is too costly.",
    ],
    whenNotToUse: [
      "Within a single relational database (use database transactions or SELECT ... FOR UPDATE).",
      "Fine-grained row-level locking under high write contention (causes massive distributed locking latency).",
      "When optimistic concurrency control (version checks, CAS) is feasible.",
    ],
    coreInvariant:
      "At any instant in time, at most one client process may hold the distributed lock for a given resource; and if the lock holder crashes, the lock must automatically release via lease expiration without deadlocking the cluster.",
  },

  whyItExists: {
    realWorldProblem:
      "Three instances of a reporting worker wake up at midnight to generate month-end invoices. Without a distributed lock, all three run the heavy SQL aggregation simultaneously, sending 3 duplicate copies of the invoice to every customer and exhausting database connection pools.",
    catastrophicScenario:
      "Client 1 acquires a distributed lock in Redis with a 10-second TTL. While writing files to S3, Client 1 experiences a 15-second Stop-The-World Java GC pause. The Redis lock lease expires after 10 seconds. Client 2 acquires the lock and starts writing to S3. Client 1's GC finishes, resumes execution thinking it still owns the lock, and writes its data to S3, silently overwriting and corrupting Client 2's new data—the classic Martin Kleppmann distributed locking failure.",
    systemImpact: [
      "Silent data corruption in shared storage and external services.",
      "Split-brain execution where two nodes act as active primary.",
      "Permanent cluster deadlocks when lock owners crash without releasing.",
      "System freeze when lock coordinators experience network partitions.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "A distributed lock coordinates mutual exclusion by storing a lock flag in a centralized coordinator (e.g. Redis, etcd, Consul, or ZooKeeper).",
      "To acquire the lock safely, the client generates a cryptographically random unique owner token (e.g., UUID) and issues an atomic conditional write: `SET resource_key owner_token NX PX 10000` (Set if Not eXists, with 10,000ms TTL).",
      "The TTL (lease) guarantees liveness: if the client crashes or loses network connectivity, the coordinator automatically purges the key after the TTL expires, allowing other nodes to acquire.",
      "To release the lock, the client must verify ownership before deleting: it must execute an atomic Lua script that compares the stored token against its own token. Naively calling `DEL key` would accidentally delete a lock acquired by a successor client if the first client's lease expired prematurely.",
      "To solve the Stop-The-World GC pause problem, systems must use Monotonic Fencing Tokens. The lock coordinator dispenses an incrementing integer (fencing token: 1, 2, 3...) with every lock grant. The target storage system checks that the caller's fencing token is strictly greater than the last written token, safely rejecting stale writes from delayed clients.",
    ],
    singleVsDistributed:
      "Redis single-node locks are fast (~1ms) and sufficient for efficiency locks (preventing duplicate work). Strongly consistent consensus locks (etcd, Consul using Raft) are mandatory for correctness locks where duplicate execution causes irrecoverable financial or state corruption.",
    semanticsAndGuarantees: [
      "Mutual Exclusion: Only one client holds the lock at any point in time.",
      "Deadlock Freedom: Leases guarantee eventual release even on client failure.",
      "Fencing Protection: Out-of-order writes from delayed clients are discarded.",
    ],
    keyAlgorithms: [
      {
        name: "Redis SET NX PX with Lua Release",
        description: "Atomic acquisition via `SET key token NX PX ttl`; atomic release via Lua script comparing token before `DEL`.",
        pros: "Ultra-fast (<1ms); low memory; widely supported.",
        cons: "Vulnerable to async Redis replica failover data loss unless using Redlock.",
      },
      {
        name: "Consensus Session Lock (etcd / ZooKeeper)",
        description: "Ephemeral znode or etcd lease tied to active client heartbeat session with linearizable Raft consensus.",
        pros: "Provably correct under network partitions and leader crashes; monotonic revision numbers act as fencing tokens.",
        cons: "Higher latency (~5-15ms) and lower write throughput than Redis.",
      },
      {
        name: "Redlock Algorithm",
        description: "Acquires lock across N independent Redis primary masters (e.g. 5 masters). Requires quorum (N/2 + 1) within valid time budget.",
        pros: "Survives individual Redis node crashes without relying on async replication.",
        cons: "Debated academic safety under unsynchronized hardware system clock drift.",
      },
    ],
  },

  visualizerType: "distributed-lock",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Generate Unique Lock Owner Identity",
      summary: "Create a random UUID per acquisition attempt.",
      explanation:
        "Every client acquisition must generate a globally unique token (UUID v4 or cryptographic random string). This token proves ownership during release.",
      pseudocode: `ownerToken = uuid.v4()`,
      considerations: [
        "Never use static strings like 'locked' as the lock value.",
      ],
    },
    {
      stepNumber: 2,
      title: "Execute Atomic Conditional Write with TTL",
      summary: "Acquire lock with NX (Not Exists) and PX (millisecond TTL) flags.",
      explanation:
        "In Redis: `SET lock:{resource} {ownerToken} NX PX {ttlMs}`. This single command is atomic in Redis's event loop.",
      considerations: [
        "Size TTL carefully: TTL must exceed maximum expected execution time plus network jitter.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Heartbeat Lease Renewal (Auto-Refresh)",
      summary: "Keep extending the lease while the task is actively executing.",
      explanation:
        "Launch a background timer (watchdog) that renews the TTL by sending `PEXPIRE` every `ttl/3` milliseconds as long as the worker thread is healthy.",
      pseudocode: `watchdog = setInterval(every ttl / 3):
  if taskStillRunning:
    renewLease(key, ownerToken, ttl)`,
      considerations: [
        "If worker crashes, watchdog stops, and lock naturally expires after TTL.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Atomic Check-and-Delete Release",
      summary: "Ensure clients only delete their own lock, never someone else's.",
      explanation:
        "Execute an atomic Lua script: check if `redis.call('GET', key) == ownerToken`. If true, delete; otherwise return 0.",
      pseudocode: `if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end`,
      considerations: [
        "A naive `GET` followed by `DEL` introduces a race condition where the lock expires between GET and DEL.",
      ],
    },
    {
      stepNumber: 5,
      title: "Generate Monotonic Fencing Tokens",
      summary: "Dispense monotonically increasing integers to detect delayed writes.",
      explanation:
        "Every successful lock acquisition increments an atomic counter (fencing token: 41, 42, 43). Pass this token with every storage write.",
      pseudocode: `token = redis.incr("lock_fencing:" + resource)
storage.write(data, fencingToken=token)`,
      considerations: [
        "Downstream storage must enforce: `if write.token < storage.highest_token: reject`.",
      ],
    },
    {
      stepNumber: 6,
      title: "Handle Acquisition Failures with Jittered Backoff",
      summary: "Poll for lock availability without hammering the coordinator.",
      explanation:
        "If lock acquisition fails, wait with randomized exponential backoff before retrying, or subscribe to lock release events via Redis pub/sub.",
      considerations: [
        "Set an overall acquisition timeout so callers don't block indefinitely.",
      ],
    },
    {
      stepNumber: 7,
      title: "Enforce Failure Recovery & Alerting",
      summary: "Alert when lock contention or lease expirations exceed safety margins.",
      explanation:
        "Monitor lock hold durations. If a lock frequently expires before being explicitly released, investigate worker task slowdowns.",
      considerations: [
        "Log a critical warning whenever an explicit release returns 0 (lock was already lost).",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "distlock.go",
      code: `package distlock

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"
)

var (
	ErrLockFailed       = errors.New("failed to acquire distributed lock")
	ErrLockLost         = errors.New("distributed lock was lost before explicit release")
)

type RedisClient interface {
	SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error)
	Eval(ctx context.Context, script string, keys []string, args ...interface{}) (interface{}, error)
}

const releaseLuaScript = \`
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
\`

type Lock struct {
	client     RedisClient
	key        string
	ownerToken string
	ttl        time.Duration
}

func NewLock(client RedisClient, key string, ttl time.Duration) (*Lock, error) {
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}

	return &Lock{
		client:     client,
		key:        "lock:" + key,
		ownerToken: hex.EncodeToString(tokenBytes),
		ttl:        ttl,
	}, nil
}

func (l *Lock) TryAcquire(ctx context.Context) (bool, error) {
	return l.client.SetNX(ctx, l.key, l.ownerToken, l.ttl)
}

func (l *Lock) Release(ctx context.Context) error {
	res, err := l.client.Eval(ctx, releaseLuaScript, []string{l.key}, l.ownerToken)
	if err != nil {
		return err
	}

	// res == int64(1) indicates successful deletion
	if val, ok := res.(int64); !ok || val != 1 {
		return ErrLockLost
	}
	return nil
}`,
      explanation:
        "Go distributed lock implementation using cryptographically secure random owner tokens, atomic SetNX, and atomic Lua script verification upon release.",
      keyDecisions: [
        "Cryptographically random 16-byte owner tokens eliminate collision risk across fleet.",
        "Lua script guarantees atomic check-and-delete on release.",
      ],
      complexityNotes: "O(1) network operation for acquire and release.",
    },

    typescript: {
      filename: "DistributedLock.ts",
      code: `export interface RedisLike {
  set(key: string, value: string, mode: string, duration: string, ttl: number): Promise<string | null>;
  eval(script: string, numKeys: number, key: string, arg: string): Promise<number>;
}

const RELEASE_LUA_SCRIPT = \`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
\`;

export class DistributedLock {
  private readonly key: string;
  private readonly ownerToken: string;

  constructor(
    private readonly redis: RedisLike,
    resourceKey: string,
    private readonly ttlMs: number = 10000
  ) {
    this.key = \`lock:\${resourceKey}\`;
    this.ownerToken = crypto.randomUUID();
  }

  public async acquire(): Promise<boolean> {
    const res = await this.redis.set(
      this.key,
      this.ownerToken,
      "NX",
      "PX",
      this.ttlMs
    );
    return res === "OK";
  }

  public async release(): Promise<boolean> {
    const deletedCount = await this.redis.eval(
      RELEASE_LUA_SCRIPT,
      1,
      this.key,
      this.ownerToken
    );
    return deletedCount === 1;
  }

  public getOwnerToken(): string {
    return this.ownerToken;
  }
}`,
      explanation:
        "TypeScript distributed lock implementation integrating Redis SET NX PX commands with Lua verification script and UUID v4 owner authentication.",
      keyDecisions: [
        "UUID v4 token ensures exclusive release ownership.",
        "Lua atomic deletion avoids race condition if lease expires during execution.",
      ],
      complexityNotes: "Sub-millisecond async network execution.",
    },

    python: {
      filename: "distributed_lock.py",
      code: `import uuid
import time
from typing import Optional

RELEASE_LUA_SCRIPT = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end
"""

class DistributedLock:
    def __init__(self, redis_client, resource_key: str, ttl_ms: int = 10000):
        self.redis = redis_client
        self.key = f"lock:{resource_key}"
        self.ttl_ms = ttl_ms
        self.owner_token = str(uuid.uuid4())
        self._release_script = self.redis.register_script(RELEASE_LUA_SCRIPT)

    def acquire(self) -> bool:
        """Atomically acquires the lock with NX and millisecond TTL."""
        acquired = self.redis.set(
            self.key,
            self.owner_token,
            nx=True,
            px=self.ttl_ms
        )
        return bool(acquired)

    def release(self) -> bool:
        """Safely releases the lock only if owned by this token."""
        result = self._release_script(
            keys=[self.key],
            args=[self.owner_token]
        )
        return result == 1

    def __enter__(self):
        if not self.acquire():
            raise RuntimeError("Failed to acquire distributed lock")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()`,
      explanation:
        "Python implementation featuring context manager (`with DistributedLock(...)`) support, pre-compiled Redis SHA Lua script registration, and UUID token tracking.",
      keyDecisions: [
        "Context manager support guarantees release execution on Python scope exit.",
        "redis.register_script optimizes Lua evaluation by utilizing SHA hashes.",
      ],
      complexityNotes: "O(1) network execution time.",
    },

    java: {
      filename: "RedisDistributedLock.java",
      code: `package com.engineeringlab.distlock;

import java.time.Duration;
import java.util.Collections;
import java.util.UUID;

public class RedisDistributedLock {
    public interface SimpleRedis {
        boolean setNxPx(String key, String value, long ttlMs);
        Object eval(String script, java.util.List<String> keys, java.util.List<String> args);
    }

    private static final String RELEASE_SCRIPT =
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "    return redis.call('del', KEYS[1]) " +
        "else " +
        "    return 0 " +
        "end";

    private final SimpleRedis redis;
    private final String lockKey;
    private final String ownerToken;
    private final long ttlMs;

    public RedisDistributedLock(SimpleRedis redis, String resourceName, Duration ttl) {
        this.redis = redis;
        this.lockKey = "lock:" + resourceName;
        this.ownerToken = UUID.randomUUID().toString();
        this.ttlMs = ttl.toMillis();
    }

    public boolean tryAcquire() {
        return redis.setNxPx(lockKey, ownerToken, ttlMs);
    }

    public boolean release() {
        Object result = redis.eval(
            RELEASE_SCRIPT,
            Collections.singletonList(lockKey),
            Collections.singletonList(ownerToken)
        );
        return Long.valueOf(1).equals(result);
    }

    public String getOwnerToken() {
        return ownerToken;
    }
}`,
      explanation:
        "Clean Java distributed lock abstraction implementing safe atomic Lua script execution with UUID identity verification.",
      keyDecisions: [
        "Encapsulates Redis eval within singleton lists for thread-safe parameter binding.",
        "UUID owner token ensures no cross-client lock hijacking.",
      ],
      complexityNotes: "O(1) network calls.",
    },
  },

  edgeCases: [
    {
      scenario: "Stop-The-World GC Pause (Martin Kleppmann Dilemma)",
      consequence:
        "Client 1 acquires lock for 10 seconds, then freezes in a 15-second GC pause. Lock lease expires in Redis. Client 2 acquires lock. Client 1 unpauses and writes to storage, corrupting Client 2's data.",
      solution:
        "Use Monotonic Fencing Tokens. The lock service issues an incrementing token (z = 42). Storage checks that the write token > previous write token; stale client writes are rejected.",
    },
    {
      scenario: "Redis Master Crash Before Asynchronous Replication",
      consequence:
        "Client 1 acquires lock on Redis Master. Master crashes before replicating the key to Redis Replica. Replica promotes to Master. Client 2 acquires the same lock. Mutual exclusion is violated.",
      solution:
        "For correctness-critical locks, use consensus-backed systems like etcd, Consul, or ZooKeeper, or deploy Redlock across independent master instances.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Unbounded Lock Holding (Deadlock via Infinite Loop)",
        description:
          "Worker enters infinite loop while watchdog keeps renewing the lease indefinitely, starving all other workers forever.",
        mitigation:
          "Enforce a hard absolute maximum lease ceiling (e.g. max 15 minutes) beyond which renewal is aborted.",
      },
    ],
    scaling10x: [
      "Avoid distributed locks for high-frequency database row updates; use database optimistic concurrency control (`UPDATE ... WHERE version = ?`).",
      "Shard lock namespaces across multiple Redis clusters to prevent bottlenecking on a single coordinator.",
    ],
    concurrencyRaceConditions: [
      "Check-then-delete race condition on release: Prevented strictly by executing check and delete atomically inside a Lua script.",
    ],
    observability: {
      metrics: [
        "lock_acquisitions_total{resource, status='success|failure'}",
        "lock_hold_duration_seconds{resource}",
        "lock_expired_before_release_total{resource}",
      ],
      logs: [
        "WARN log if lock hold duration exceeds 80% of TTL.",
      ],
      traces: [
        "Distributed trace span 'lock.acquire' recording wait time and owner ID.",
      ],
    },
    securityNotes: [
      "Ensure lock keys cannot be manipulated via unsanitized user input to cause denial of service across resources.",
    ],
  },

  tradeoffs: [
    {
      approach: "Redis SET NX PX + Lua",
      advantages: "Sub-millisecond acquisition latency; simple operational footprint; low resource cost.",
      disadvantages: "Asynchronous replication can lose locks on master crash; clock drift risk.",
      useWhen: "Efficiency locks (preventing duplicate work, cron job coordination, caching).",
    },
    {
      approach: "Consensus Locks (etcd / ZooKeeper / Consul)",
      advantages: "Provably strong consistency; survive leader crashes without losing locks; built-in monotonic fencing.",
      disadvantages: "Higher latency (5-20ms); heavier operational complexity.",
      useWhen: "Correctness locks (financial settlement, split-brain leader election, schema migrations).",
    },
  ],

  furtherReading: [
    {
      title: "How to do distributed locking",
      type: "Blog",
      authorOrOrg: "Martin Kleppmann (Cambridge University)",
      description: "The seminal critique of distributed locking, GC pauses, and the introduction of fencing tokens.",
      url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
    },
    {
      title: "Distributed Locks with Redis (Redlock)",
      type: "Blog",
      authorOrOrg: "Salvatore Sanfilippo (antirez)",
      description: "The original Redlock specification and response to distributed systems trade-offs.",
      url: "https://redis.io/docs/manual/patterns/distributed-locks/",
    },
  ],
};
