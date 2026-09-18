import { Concept } from "./types";

export const caching: Concept = {
  slug: "caching",
  title: "Caching Strategies & Invalidation",
  shortDescription:
    "Accelerate read throughput by orders of magnitude while mastering Cache-Aside, Write-Through, stampede defense, and cache consistency.",
  category: "Data",
  difficulty: "Intermediate",
  estimatedTime: "~30 min",
  topics: [
    "Cache-Aside (Lazy Loading)",
    "Write-Through & Write-Back",
    "Cache Stampede (Thundering Herd)",
    "Cache Penetration & Bloom Filters",
    "TTL & Eviction Policies",
    "Dual-Write Inconsistency",
  ],

  overview: {
    problemStatement:
      "Relational databases and disk-backed datastores are bound by disk I/O, relational joins, indexing overhead, and connection pool limits. Repeatedly computing and querying the same static or semi-static data directly from the primary database leads to saturation, high p99 latencies, and scalability plateaus.",
    whenToUse: [
      "Read-heavy workloads with a high read-to-write ratio (e.g. 10:1 or 100:1).",
      "Expensive computational results (e.g. aggregated reporting, parsed JSON, token validation).",
      "Protecting downstream relational databases from traffic surges.",
    ],
    whenNotToUse: [
      "Write-heavy workloads where data changes continuously before ever being read.",
      "Strict real-time systems where reading stale data by even 1 millisecond causes regulatory violation.",
      "Small, low-traffic applications where database queries execute in under 2ms without contention.",
    ],
    coreInvariant:
      "A cache is an optimization, not the source of truth; any cached entry must be reproducible from the primary store, and cache invalidation must prevent permanent divergence.",
  },

  whyItExists: {
    realWorldProblem:
      "A social network home feed queries user profiles, friend lists, and post counts. Without caching, a single user page view runs 15 SQL queries. With 100,000 active users, the database faces 1,500,000 queries per second. Physical SSD IOPS saturate, connection queues fill up, and query latency escalates from 5ms to 8,000ms.",
    catastrophicScenario:
      "A national news site breaks a major election story. The cached article key expires at 20:00:00. At that exact millisecond, 50,000 concurrent readers request the page. All 50,000 requests experience a cache miss and simultaneously query PostgreSQL to render the article. The database CPU hits 100%, IOPS exhaust, the primary database crashes, and the website goes offline globally—a classic Cache Stampede.",
    systemImpact: [
      "Primary database CPU saturation and I/O starvation.",
      "Latency degradation across unrelated write transactions sharing the database.",
      "Out-of-memory crashes on cache nodes due to unconstrained key growth.",
      "Silent data corruption when stale cache writes overwrite newer database records.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Caching introduces a fast, volatile in-memory tier (e.g., Redis, Memcached) between the application and the persistent database.",
      "In Cache-Aside (Lazy Loading), the application queries the cache first. If found (Cache Hit), data is returned in <1ms. If not found (Cache Miss), the application reads from the database, writes the result into the cache with a Time-To-Live (TTL), and returns.",
      "In Write-Through, writes are made to the cache and the database synchronously in a single operation, ensuring high read consistency.",
      "In Write-Back (Write-Behind), the application writes only to the cache and immediately acknowledges the client. An asynchronous worker flushes modified keys in batches to the database. This delivers immense write performance but risks data loss on cache node crashes.",
    ],
    singleVsDistributed:
      "In-process caching (e.g., Go sync.Map, Java Caffeine) provides sub-microsecond lookups with zero network serialization, but consumes process RAM and suffers from per-node inconsistency. Distributed caching (e.g., Redis Cluster) provides a unified cache across all application instances but adds 1-2ms network round trips.",
    semanticsAndGuarantees: [
      "Eventual consistency: Cached data may lag primary data during the propagation/invalidation window.",
      "Bounded memory: Eviction policies (LRU, LFU) ensure memory limits are never exceeded.",
      "Cache penetration defense: Caching null values or using Bloom filters stops non-existent keys from hammering the database.",
    ],
    keyAlgorithms: [
      {
        name: "Cache-Aside (Lazy Loading)",
        description: "App checks cache -> on miss, reads DB and populates cache. On write, updates DB and invalidates (deletes) cache key.",
        pros: "Only caches requested data; resilient to cache node failure.",
        cons: "Cache miss latency penalty; risk of reading stale data if invalidation fails.",
      },
      {
        name: "Write-Through",
        description: "App writes to cache, which synchronously writes to DB before returning.",
        pros: "Cache is never stale; immediate read availability.",
        cons: "Higher write latency; caches unused data if writes exceed reads.",
      },
      {
        name: "Probabilistic Early Expiration (XFetch)",
        description: "As TTL approaches expiration, background workers probabilistically recompute the cache before it expires: time - beta * delta * ln(random()) > ttl.",
        pros: "Completely eliminates Cache Stampede without distributed locks.",
        cons: "Slightly higher compute overhead near expiration.",
      },
    ],
  },

  visualizerType: "cache",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Identify Expensive Read Queries & Key Naming",
      summary: "Define deterministic, namespaced cache key schemas.",
      explanation:
        "Structure keys hierarchically: `{service}:{entity}:{id}:{version}` (e.g., `shop:product:9482:v1`). Include schema version numbers to enable instant global cache busting during migrations.",
      considerations: [
        "Avoid unbounded key lengths that waste memory in Redis key indexes.",
      ],
    },
    {
      stepNumber: 2,
      title: "Implement Cache-Aside Read Pattern",
      summary: "Check cache first; fallback to database on miss.",
      explanation:
        "Execute GET key. If found, deserialize JSON/Protobuf and return. If nil, acquire read from DB, serialize, SET with TTL, and return.",
      pseudocode: `function getProduct(id):
  key = "product:" + id
  val = cache.get(key)
  if val != null:
    return deserialize(val)
  
  data = db.query("SELECT * FROM products WHERE id = ?", id)
  if data != null:
    cache.set(key, serialize(data), ttl=3600)
  return data`,
      considerations: [
        "Cache misses should not throw errors; treat them as normal execution branches.",
      ],
    },
    {
      stepNumber: 3,
      title: "Select Eviction Policy & Time-To-Live (TTL)",
      summary: "Prevent memory exhaustion and guarantee eventual freshness.",
      explanation:
        "Always set an explicit TTL on every key. Configure Redis maxmemory eviction policy to `allkeys-lru` (Least Recently Used) or `volatile-lfu` (Least Frequently Used).",
      considerations: [
        "Keys without TTLs are memory leaks in distributed caches.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Invalidation on Mutation",
      summary: "Invalidate (delete) cache keys rather than updating them.",
      explanation:
        "On database UPDATE or DELETE: update database first, then DELETE the cache key. Deleting is superior to updating because it prevents race conditions where an old write overwrites a newer write.",
      pseudocode: `function updateProduct(id, updates):
  db.execute("UPDATE products SET ... WHERE id = ?", id)
  cache.delete("product:" + id)`,
      considerations: [
        "Never update cache before database; if DB transaction fails, cache has corrupted dirty data.",
      ],
    },
    {
      stepNumber: 5,
      title: "Prevent Cache Stampede (Single-Flight Locking)",
      summary: "Ensure only one worker queries the database on a popular key miss.",
      explanation:
        "When a high-traffic key expires, use Go's `singleflight.Group` or Redis distributed mutex so only 1 thread queries the database, while other concurrent callers wait for the result.",
      considerations: [
        "Alternative: Probabilistic early recomputation (XFetch algorithm).",
      ],
    },
    {
      stepNumber: 6,
      title: "Defend Against Cache Penetration & Breakdown",
      summary: "Handle queries for non-existent database records.",
      explanation:
        "If a client queries non-existent ID `99999999`, the DB returns empty. Without caching, repeated requests hit the DB every time. Cache empty/null markers with a short TTL (e.g. 60 seconds) or deploy a Bloom filter.",
      considerations: [
        "Keep null-value TTL short so newly created entities become visible quickly.",
      ],
    },
    {
      stepNumber: 7,
      title: "Implement Health Degradation Fallback",
      summary: "Allow application to survive total cache cluster downtime.",
      explanation:
        "Wrap cache calls with short timeouts (<10ms) and circuit breakers. If Redis crashes, bypass cache and read directly from DB under reduced traffic concurrency.",
      considerations: [
        "Ensure DB has sufficient read connection pool headroom during cache outages.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "cache_aside.go",
      code: `package cache

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

type Store interface {
	Get(ctx context.Context, key string) ([]byte, bool, error)
	Set(ctx context.Context, key string, val []byte, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type SingleFlight struct {
	mu sync.Mutex
	m  map[string]*call
}

type call struct {
	wg  sync.WaitGroup
	val interface{}
	err error
}

func (g *SingleFlight) Do(key string, fn func() (interface{}, error)) (interface{}, error) {
	g.mu.Lock()
	if g.m == nil {
		g.m = make(map[string]*call)
	}
	if c, ok := g.m[key]; ok {
		g.mu.Unlock()
		c.wg.Wait()
		return c.val, c.err
	}
	c := new(call)
	c.wg.Add(1)
	g.m[key] = c
	g.mu.Unlock()

	c.val, c.err = fn()
	c.wg.Done()

	g.mu.Lock()
	delete(g.m, key)
	g.mu.Unlock()

	return c.val, c.err
}

type CacheAside[T any] struct {
	store Store
	sf    SingleFlight
	ttl   time.Duration
}

func NewCacheAside[T any](store Store, ttl time.Duration) *CacheAside[T] {
	return &CacheAside[T]{store: store, ttl: ttl}
}

func (c *CacheAside[T]) GetOrLoad(ctx context.Context, key string, loader func() (T, error)) (T, error) {
	var zero T

	// 1. Try reading from cache
	cachedBytes, found, err := c.store.Get(ctx, key)
	if err == nil && found {
		var result T
		if err := json.Unmarshal(cachedBytes, &result); err == nil {
			return result, nil
		}
	}

	// 2. Cache miss: suppress stampede via SingleFlight
	res, err := c.sf.Do(key, func() (interface{}, error) {
		// Double check cache inside singleflight
		if bytes, ok, _ := c.store.Get(ctx, key); ok {
			var r T
			if json.Unmarshal(bytes, &r) == nil {
				return r, nil
			}
		}

		// Load from database
		data, err := loader()
		if err != nil {
			return zero, err
		}

		// Asynchronously or synchronously populate cache
		if encoded, err := json.Marshal(data); err == nil {
			_ = c.store.Set(ctx, key, encoded, c.ttl)
		}

		return data, nil
	})

	if err != nil {
		return zero, err
	}
	return res.(T), nil
}`,
      explanation:
        "Production Go generic Cache-Aside implementation featuring SingleFlight suppression to eliminate Cache Stampede (thundering herd) on hot key expirations.",
      keyDecisions: [
        "Embedded SingleFlight mutex deduplication ensures only 1 DB query per concurrent key miss.",
        "Double-check locking inside SingleFlight handles cases where prior call already populated cache.",
      ],
      complexityNotes: "O(1) cache lookup; eliminates concurrent database query multiplication.",
    },

    typescript: {
      filename: "CacheAside.ts",
      code: `export interface CacheDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class CacheAside {
  private inFlight = new Map<string, Promise<any>>();

  constructor(
    private readonly driver: CacheDriver,
    private readonly defaultTtlSec: number = 300
  ) {}

  public async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const ttl = ttlSeconds ?? this.defaultTtlSec;

    // 1. Cache probe
    try {
      const cached = await this.driver.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Degrade gracefully on cache read error
    }

    // 2. Thundering herd suppression via Promise memoization
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const loadPromise = (async () => {
      try {
        const freshData = await loader();
        if (freshData !== undefined && freshData !== null) {
          await this.driver
            .set(key, JSON.stringify(freshData), ttl)
            .catch(() => {});
        }
        return freshData;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, loadPromise);
    return loadPromise;
  }

  public async invalidate(key: string): Promise<void> {
    this.inFlight.delete(key);
    await this.driver.del(key);
  }
}`,
      explanation:
        "TypeScript implementation using in-flight Promise memoization to collapse hundreds of simultaneous async reads for an expired key into a single database query.",
      keyDecisions: [
        "In-flight map suppresses stampedes across async event loops.",
        "Silently catches Redis connection errors to fall back cleanly to database.",
      ],
      complexityNotes: "Sub-millisecond memory memoization; zero duplicate network queries.",
    },

    python: {
      filename: "cache_aside.py",
      code: `import json
import threading
import time
from typing import Callable, Any, Optional

class CacheAside:
    def __init__(self, cache_client, default_ttl_sec: int = 300):
        self.cache = cache_client
        self.default_ttl = default_ttl_sec
        self._lock = threading.Lock()
        self._inflight = {}

    def get_or_load(self, key: str, loader: Callable[[], Any], ttl: Optional[int] = None) -> Any:
        ttl_sec = ttl or self.default_ttl

        # 1. Probe cache
        try:
            val = self.cache.get(key)
            if val is not None:
                return json.loads(val)
        except Exception:
            pass # Fail open to DB

        # 2. Prevent stampede via synchronized mutex per key
        with self._lock:
            event = self._inflight.get(key)
            if event is None:
                event = threading.Event()
                self._inflight[key] = event
                is_leader = True
            else:
                is_leader = False

        if not is_leader:
            event.wait(timeout=5.0)
            # Re-read cache populated by leader
            cached = self.cache.get(key)
            if cached is not None:
                return json.loads(cached)
            return loader()

        try:
            fresh_data = loader()
            if fresh_data is not None:
                self.cache.setex(key, ttl_sec, json.dumps(fresh_data))
            return fresh_data
        finally:
            with self._lock:
                self._inflight.pop(key, None)
                event.set()

    def invalidate(self, key: str):
        self.cache.delete(key)`,
      explanation:
        "Python implementation employing threading.Event leader-follower pattern to protect downstream databases from sudden cache stampedes across concurrent worker threads.",
      keyDecisions: [
        "threading.Event coordinates parallel workers so only one thread executes loader().",
        "Invalidation deletes cache key rather than writing to avoid dirty reads.",
      ],
      complexityNotes: "Thread-safe O(1) coordination.",
    },

    java: {
      filename: "CacheAsideService.java",
      code: `package com.engineeringlab.caching;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

public class CacheAsideService {
    public interface CacheDriver {
        String get(String key);
        void set(String key, String value, Duration ttl);
        void delete(String key);
    }

    private final CacheDriver driver;
    private final Duration defaultTtl;
    private final ConcurrentHashMap<String, CompletableFuture<String>> inFlight = new ConcurrentHashMap<>();

    public CacheAsideService(CacheDriver driver, Duration defaultTtl) {
        this.driver = driver;
        this.defaultTtl = defaultTtl;
    }

    public String getOrLoad(String key, Supplier<String> loader) {
        // 1. Probe cache
        try {
            String cached = driver.get(key);
            if (cached != null) return cached;
        } catch (Exception ignored) {}

        // 2. Single-flight future deduplication
        CompletableFuture<String> future = inFlight.computeIfAbsent(key, k -> CompletableFuture.supplyAsync(() -> {
            try {
                // Double check cache
                String doubleCheck = driver.get(k);
                if (doubleCheck != null) return doubleCheck;

                String fresh = loader.get();
                if (fresh != null) {
                    driver.set(k, fresh, defaultTtl);
                }
                return fresh;
            } finally {
                inFlight.remove(k);
            }
        }));

        return future.join();
    }

    public void invalidate(String key) {
        inFlight.remove(key);
        driver.delete(key);
    }
}`,
      explanation:
        "Java implementation using ConcurrentHashMap and CompletableFuture to achieve non-blocking single-flight query coalescing under massive concurrency.",
      keyDecisions: [
        "ConcurrentHashMap.computeIfAbsent atomically registers leader task.",
        "CompletableFuture.join() allows follower threads to wait on the single database read.",
      ],
      complexityNotes: "High concurrency throughput with zero lock contention bottlenecks.",
    },
  },

  edgeCases: [
    {
      scenario: "Cache Stampede (Thundering Herd)",
      consequence:
        "A heavily accessed key expires. 10,000 parallel requests miss simultaneously and overwhelm the primary database.",
      solution:
        "Deploy SingleFlight request collapsing or implement the XFetch probabilistic early recomputation algorithm.",
    },
    {
      scenario: "Cache Penetration",
      consequence:
        "Attackers query millions of non-existent IDs. Every request misses the cache and hits the database.",
      solution:
        "Cache empty/null results with a short 60-second TTL, or place a Bloom filter in front of the cache to intercept non-existent keys.",
    },
    {
      scenario: "Dual-Write Race Condition",
      consequence:
        "Thread 1 updates DB, then pauses. Thread 2 updates DB and updates cache. Thread 1 resumes and writes stale data into cache.",
      solution:
        "Never update cache values directly on DB mutations—always DELETE (invalidate) the cache key instead.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Cold Cache Node Restart Crash",
        description:
          "A replacement cache node boots with 0% warmed keys. 100% of traffic drops to the database, crashing it.",
        mitigation:
          "Warm cache keys pre-emptively from read replicas before routing live user traffic to new nodes.",
      },
      {
        title: "Large Value Serialization CPU Spikes",
        description:
          "Caching 10MB JSON arrays causes GC pauses and high CPU utilization during unmarshalling.",
        mitigation:
          "Enforce max object size limits (<100KB); compress large blobs with Snappy/zstd or store normalized IDs.",
      },
    ],
    scaling10x: [
      "Implement multi-tier caching: L1 in-process memory (Caffeine/sync.Map) with 5-second TTL + L2 distributed Redis cluster with 1-hour TTL.",
      "Add randomized TTL jitter (+/- 15%) to prevent mass synchronized key expirations.",
      "Shard Redis across multiple nodes using Consistent Hashing.",
    ],
    concurrencyRaceConditions: [
      "Cache invalidation order: Always commit the database transaction BEFORE deleting the cache key.",
    ],
    observability: {
      metrics: [
        "cache_hits_total{store}",
        "cache_misses_total{store}",
        "cache_hit_ratio{store}",
        "cache_operation_latency_seconds (p50, p99)",
      ],
      logs: [
        "WARN log on cache connection timeouts and fail-open transitions.",
      ],
      traces: [
        "Trace span 'cache.get' with tags 'cache.hit: true/false'.",
      ],
    },
    securityNotes: [
      "Encrypt sensitive PII (tokens, credit cards) before storing in shared Redis instances.",
    ],
  },

  tradeoffs: [
    {
      approach: "Cache-Aside (Lazy)",
      advantages: "Only caches queried data; resilient to cache node failure.",
      disadvantages: "Miss latency penalty; eventual consistency lag on updates.",
      useWhen: "Standard read-heavy application workflows.",
    },
    {
      approach: "Write-Through",
      advantages: "Zero read misses for written data; high consistency.",
      disadvantages: "Higher write latency; pollutes cache with unread writes.",
      useWhen: "Data that is guaranteed to be read immediately after creation.",
    },
    {
      approach: "Write-Back (Write-Behind)",
      advantages: "Ultra-fast writes; absorbs intense write spikes.",
      disadvantages: "Risk of data loss if cache crashes before flushing to DB.",
      useWhen: "High-volume analytics, IoT telemetry counters, gaming scoreboards.",
    },
  ],

  furtherReading: [
    {
      title: "Optimal Probabilistic Cache Expiration (XFetch)",
      type: "Paper",
      authorOrOrg: "Vattani, Chierichetti, Lowenstein",
      description: "Mathematical formulation of the XFetch algorithm for stamping out cache stampedes.",
      url: "https://www.vldb.org/pvldb/vol8/p886-vattani.pdf",
    },
    {
      title: "Scaling Memcache at Facebook",
      type: "Paper",
      authorOrOrg: "Meta Engineering (NSDI '13)",
      description: "Classic architecture paper on building the world's largest distributed cache tier.",
      url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
    },
  ],
};
