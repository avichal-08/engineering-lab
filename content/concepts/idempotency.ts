import { Concept } from "./types";

export const idempotency: Concept = {
  slug: "idempotency",
  title: "Idempotency",
  shortDescription:
    "Guarantee that repeating an identical mutating operation produces the exact same system state and response without duplicate side effects.",
  category: "Reliability",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Idempotency Keys",
    "At-Least-Once Delivery",
    "Network Partitions",
    "Concurrent Duplicate Requests",
    "Database Unique Constraints",
    "Payload Hash Verification",
  ],

  overview: {
    problemStatement:
      "In distributed computing, networks are unreliable (the Two Generals' Problem). When a client sends a mutating request (like charging a credit card or transferring funds) and the connection drops before receiving the response, the client cannot know whether the server executed the mutation or failed before execution. Re-issuing the request risks catastrophic double-mutations.",
    whenToUse: [
      "Financial transactions, payment gateways, and balance deductions.",
      "Order creation, inventory reservation, and reservation dispatch.",
      "Webhook delivery receivers and message queue consumers subject to at-least-once delivery.",
      "Any REST POST / PUT mutating endpoint exposed over public or unreliable mobile networks.",
    ],
    whenNotToUse: [
      "Naturally idempotent operations like GET, PUT with complete resource replacement, or DELETE by primary key.",
      "Append-only telemetry and log ingestion pipelines where high throughput outweighs rare duplicates.",
      "Read-only queries without state mutations.",
    ],
    coreInvariant:
      "f(f(x)) = f(x): Executing an operation multiple times with the same idempotency key must yield identical database state and identical client response as executing it once.",
  },

  whyItExists: {
    realWorldProblem:
      "A mobile app user taps 'Pay $500'. The API server receives the request, inserts the payment into PostgreSQL, and commits the transaction. Before sending the HTTP 200 response, the cell tower drops the connection. The mobile client sees a socket timeout and automatically retries. The server receives a second 'Pay $500' and executes another deduction. The customer is charged $1,000.",
    catastrophicScenario:
      "During an automated subscription renewal run, a worker issues 100,000 billing calls. An upstream gateway times out on 20,000 requests. The worker's retry policy fires, rebilling the 20,000 customers. Because the billing endpoint was not idempotent, 20,000 bank accounts suffer double debits, triggering thousands of overdraft fees, bank dispute chargebacks, and regulatory compliance fines.",
    systemImpact: [
      "Double financial debits and erroneous ledger imbalances.",
      "Duplicate stock allocations causing phantom negative inventory.",
      "Loss of consumer trust and severe compliance penalties.",
      "Inability to deploy aggressive automatic retries safely.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "To achieve idempotency on non-idempotent operations (like HTTP POST), the caller generates a cryptographically random unique identifier—an Idempotency Key (typically a UUID v4) sent in the request header.",
      "When the server receives the request, it checks whether this key already exists in a durable transaction log or key-value store within an atomic transaction.",
      "If the key is found and its status is 'COMPLETED', the server bypasses business logic completely and returns the cached HTTP status code and response body from the original execution.",
      "If the key exists with status 'IN_PROGRESS', a concurrent duplicate is currently executing. The server either waits or rejects with HTTP 409 Conflict.",
      "If the key does not exist, the server inserts a lock record ('IN_PROGRESS'), executes the business logic inside a database transaction, stores the serialized response body, marks the record 'COMPLETED', and returns.",
    ],
    singleVsDistributed:
      "Single-node systems can use in-memory locks or a single database table. Distributed systems must leverage atomic distributed locks or database ACID transactions with unique constraints on (user_id, idempotency_key) to prevent race conditions across parallel worker instances.",
    semanticsAndGuarantees: [
      "Exactly-once execution semantics: From the client's perspective, side effects occur exactly once.",
      "Payload fingerprint verification: The server verifies that subsequent requests with the same key have not altered the request payload (preventing accidental key reuse with different parameters).",
      "Bounded key TTL: Keys are retained for a configurable retention window (e.g., 24 to 72 hours).",
    ],
    keyAlgorithms: [
      {
        name: "RDBMS Unique Constraint Log",
        description: "Insert key into an 'idempotency_keys' table with a UNIQUE constraint within the business database transaction.",
        pros: "Provides 100% ACID consistency; response cache and business mutation commit or rollback atomically.",
        cons: "Adds write load to primary database; requires schema migrations.",
      },
      {
        name: "Redis SETNX / Distributed Mutex",
        description: "Acquire an atomic lease in Redis via SETNX key status='IN_PROGRESS' with an expiration TTL, then execute backend logic.",
        pros: "Very fast; relieves write pressure from relational database.",
        cons: "Requires two-phase coordination if Redis and database become desynchronized during crashes.",
      },
      {
        name: "Payload Fingerprinting (SHA-256)",
        description: "Compute SHA-256 hash of (request method + path + body). Store alongside idempotency key and reject if key matches but hash differs.",
        pros: "Detects corrupted retries and programmer errors immediately.",
        cons: "Requires deterministic JSON serialization before hashing.",
      },
    ],
  },

  visualizerType: "idempotency",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Require Client-Generated Idempotency Key",
      summary: "Enforce an Idempotency-Key HTTP header on mutating endpoints.",
      explanation:
        "Clients create a UUID v4 per logical intent. If a user clicks 'Submit' twice on the UI, the client sends the identical key. If the user initiates a separate transaction, a new key is minted.",
      pseudocode: `key = request.headers.get("Idempotency-Key")
if not key:
  return BadRequest("Missing Idempotency-Key header")`,
      considerations: [
        "Enforce max length (e.g. 255 chars) and regex validation on the key.",
      ],
    },
    {
      stepNumber: 2,
      title: "Compute Request Payload Hash",
      summary: "Hash the canonicalized request parameters to verify intent integrity.",
      explanation:
        "Compute SHA-256(method + path + body). If a subsequent request reuses an existing key with different parameters (e.g., trying to charge $1000 instead of $100), reject with HTTP 422 Unprocessable Entity.",
      considerations: [
        "Sort JSON keys before hashing to prevent whitespace or key ordering false positives.",
      ],
    },
    {
      stepNumber: 3,
      title: "Atomic Lock Reservation (IN_PROGRESS)",
      summary: "Reserve the key atomically before running business logic.",
      explanation:
        "Attempt to insert into idempotency table with status 'STARTED' or acquire a distributed lock. If duplicate key error occurs, query existing record.",
      pseudocode: `INSERT INTO idempotency_records (key, client_id, payload_hash, status, created_at)
VALUES (?, ?, ?, 'IN_PROGRESS', NOW())
ON CONFLICT (client_id, key) DO NOTHING;`,
      considerations: [
        "Include client_id in unique index to prevent cross-tenant key collisions.",
      ],
    },
    {
      stepNumber: 4,
      title: "Handle In-Flight Concurrent Duplicates",
      summary: "Safely handle parallel requests arriving with the same key.",
      explanation:
        "If the key is found and status is 'IN_PROGRESS', a parallel thread is actively processing the first request. Return HTTP 409 Conflict with 'Concurrent request in flight' or wait on an advisory lock.",
      considerations: [
        "Set a lock timeout so a crashed worker doesn't leave keys permanently locked.",
      ],
    },
    {
      stepNumber: 5,
      title: "Execute Business Transaction",
      summary: "Run mutating business logic inside transactional boundaries.",
      explanation:
        "Execute charges, inventory deductions, or account transfers within the core database transaction.",
      considerations: [
        "Keep the external third-party calls isolated or coordinated with two-phase commit.",
      ],
    },
    {
      stepNumber: 6,
      title: "Persist Serialized Response & Mark COMPLETED",
      summary: "Store HTTP status code and response payload in the idempotency record.",
      explanation:
        "Once business logic succeeds, update the record: status = 'COMPLETED', response_code = 200, response_body = JSON. Commit atomically.",
      considerations: [
        "Compress response body if payloads are large.",
      ],
    },
    {
      stepNumber: 7,
      title: "Replay Cached Response on Retry",
      summary: "Return identical response code and payload headers on subsequent calls.",
      explanation:
        "When a retry arrives with a COMPLETED key, fetch cached record and write exact headers, status code, and body back to client.",
      considerations: [
        "Include an 'Idempotency-Replayed: true' header for client observability.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "idempotency.go",
      code: `package idempotency

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

type Status string

const (
	StatusInProgress Status = "IN_PROGRESS"
	StatusCompleted  Status = "COMPLETED"
)

var (
	ErrConcurrentRequest = errors.New("concurrent request in flight for idempotency key")
	ErrPayloadMismatch   = errors.New("idempotency key reused with different request payload")
)

type Record struct {
	Key          string
	PayloadHash  string
	Status       Status
	StatusCode   int
	ResponseBody []byte
	CreatedAt    time.Time
}

type Store struct {
	mu      sync.Mutex
	records map[string]*Record
	ttl     time.Duration
}

func NewStore(ttl time.Duration) *Store {
	return &Store{
		records: make(map[string]*Record),
		ttl:     ttl,
	}
}

func HashPayload(payload []byte) string {
	h := sha256.Sum256(payload)
	return hex.EncodeToString(h[:])
}

// Execute wraps an operation with idempotency enforcement.
func (s *Store) Execute(
	key string,
	payload []byte,
	handler func() (int, []byte, error),
) (int, []byte, bool, error) {
	s.mu.Lock()
	payloadHash := HashPayload(payload)
	rec, exists := s.records[key]

	if exists {
		// Verify payload integrity
		if rec.PayloadHash != payloadHash {
			s.mu.Unlock()
			return 0, nil, false, ErrPayloadMismatch
		}

		if rec.Status == StatusInProgress {
			s.mu.Unlock()
			return 0, nil, false, ErrConcurrentRequest
		}

		// Replay cached response
		code := rec.StatusCode
		body := rec.ResponseBody
		s.mu.Unlock()
		return code, body, true, nil
	}

	// Reserve key atomically
	s.records[key] = &Record{
		Key:         key,
		PayloadHash: payloadHash,
		Status:      StatusInProgress,
		CreatedAt:   time.Now(),
	}
	s.mu.Unlock()

	// Execute mutating business logic
	statusCode, responseBody, err := handler()

	s.mu.Lock()
	defer s.mu.Unlock()

	if err != nil {
		// Remove lock so client can retry afresh
		delete(s.records, key)
		return 0, nil, false, err
	}

	// Persist completed outcome
	s.records[key].Status = StatusCompleted
	s.records[key].StatusCode = statusCode
	s.records[key].ResponseBody = responseBody

	return statusCode, responseBody, false, nil
}`,
      explanation:
        "Thread-safe Go idempotency manager using SHA-256 request payload verification, atomic in-progress reservations, and cached response replay.",
      keyDecisions: [
        "Detects accidental key reuse across conflicting payloads with SHA-256 fingerprinting.",
        "Releases in-progress reservation if handler fails so client can retry.",
      ],
      complexityNotes: "O(1) memory lookup; sub-microsecond reservation under mutex.",
    },

    typescript: {
      filename: "IdempotencyService.ts",
      code: `import { createHash } from "crypto";

export enum IdempotencyStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export interface StoredResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}

export interface IdempotencyRecord {
  key: string;
  payloadHash: string;
  status: IdempotencyStatus;
  response?: StoredResponse;
  expiresAt: number;
}

export class IdempotencyService {
  private store = new Map<string, IdempotencyRecord>();

  constructor(private readonly ttlMs: number = 86400000) {} // 24 hours

  public hash(body: any): string {
    const serialized = typeof body === "string" ? body : JSON.stringify(body);
    return createHash("sha256").update(serialized).digest("hex");
  }

  public async runWithIdempotency<T>(
    key: string,
    payload: any,
    fn: () => Promise<{ statusCode: number; body: T }>
  ): Promise<{ statusCode: number; body: T; replayed: boolean }> {
    const payloadHash = this.hash(payload);
    const existing = this.store.get(key);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new Error("422: Idempotency-Key reused with conflicting payload");
      }

      if (existing.status === IdempotencyStatus.IN_PROGRESS) {
        throw new Error("409: Concurrent request currently in flight");
      }

      if (existing.status === IdempotencyStatus.COMPLETED && existing.response) {
        return {
          statusCode: existing.response.statusCode,
          body: existing.response.body as T,
          replayed: true,
        };
      }
    }

    // Lock key
    this.store.set(key, {
      key,
      payloadHash,
      status: IdempotencyStatus.IN_PROGRESS,
      expiresAt: Date.now() + this.ttlMs,
    });

    try {
      const result = await fn();

      this.store.set(key, {
        key,
        payloadHash,
        status: IdempotencyStatus.COMPLETED,
        response: {
          statusCode: result.statusCode,
          body: result.body,
          headers: { "X-Idempotent-Replay": "true" },
        },
        expiresAt: Date.now() + this.ttlMs,
      });

      return {
        statusCode: result.statusCode,
        body: result.body,
        replayed: false,
      };
    } catch (err) {
      this.store.delete(key);
      throw err;
    }
  }
}`,
      explanation:
        "Modern TypeScript idempotency middleware tracking in-flight reservations and serializing completed response envelopes.",
      keyDecisions: [
        "Distinguishes freshly executed mutations from replayed cached outcomes with boolean flag.",
        "Automatically deletes lock record on unexpected errors to allow retry recovery.",
      ],
      complexityNotes: "O(1) memory lookup.",
    },

    python: {
      filename: "idempotency_manager.py",
      code: `import hashlib
import json
import threading
from typing import Callable, Tuple, Any, Dict, Optional

class IdempotencyConflict(Exception): pass
class PayloadMismatch(Exception): pass

class IdempotencyManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, Dict[str, Any]] = {}

    def _hash(self, payload: Any) -> str:
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def execute(
        self,
        key: str,
        payload: Any,
        handler: Callable[[], Tuple[int, Any]]
    ) -> Tuple[int, Any, bool]:
        """
        Executes handler with idempotency semantics.
        Returns: (status_code, response_body, is_replayed)
        """
        payload_hash = self._hash(payload)

        with self._lock:
            rec = self._records.get(key)
            if rec:
                if rec["payload_hash"] != payload_hash:
                    raise PayloadMismatch("Idempotency key reused with mismatched payload")
                if rec["status"] == "IN_PROGRESS":
                    raise IdempotencyConflict("Duplicate request already in progress")
                if rec["status"] == "COMPLETED":
                    return rec["status_code"], rec["body"], True

            # Reserve key
            self._records[key] = {
                "payload_hash": payload_hash,
                "status": "IN_PROGRESS"
            }

        try:
            status_code, body = handler()
        except Exception as e:
            with self._lock:
                self._records.pop(key, None)
            raise e

        with self._lock:
            self._records[key] = {
                "payload_hash": payload_hash,
                "status": "COMPLETED",
                "status_code": status_code,
                "body": body
            }

        return status_code, body, False`,
      explanation:
        "Thread-safe Python idempotency manager sorting JSON dictionary keys before SHA-256 calculation for deterministic hashing across differing client JSON serializers.",
      keyDecisions: [
        "sort_keys=True ensures key-order independence during payload serialization.",
        "Thread-safe lock acquisition during record checks and state transitions.",
      ],
      complexityNotes: "O(1) dictionary key lookup.",
    },

    java: {
      filename: "IdempotencyExecutor.java",
      code: `package com.engineeringlab.idempotency;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class IdempotencyExecutor {
    public enum Status { IN_PROGRESS, COMPLETED }

    public record ExecutionResult(int statusCode, String body, boolean isReplayed) {}

    private static class Record {
        final String payloadHash;
        volatile Status status;
        volatile int statusCode;
        volatile String body;

        Record(String payloadHash) {
            this.payloadHash = payloadHash;
            this.status = Status.IN_PROGRESS;
        }
    }

    private final ConcurrentHashMap<String, Record> store = new ConcurrentHashMap<>();

    public ExecutionResult execute(String key, String payload, Supplier<ExecutionResult> action) throws Exception {
        String hash = hashPayload(payload);

        Record record = store.compute(key, (k, existing) -> {
            if (existing == null) {
                return new Record(hash);
            }
            if (!existing.payloadHash.equals(hash)) {
                throw new IllegalArgumentException("Payload mismatch for idempotency key: " + k);
            }
            if (existing.status == Status.IN_PROGRESS) {
                throw new IllegalStateException("Concurrent request in progress for key: " + k);
            }
            return existing; // already completed
        });

        if (record.status == Status.COMPLETED) {
            return new ExecutionResult(record.statusCode, record.body, true);
        }

        try {
            ExecutionResult outcome = action.get();
            record.statusCode = outcome.statusCode();
            record.body = outcome.body();
            record.status = Status.COMPLETED;
            return new ExecutionResult(outcome.statusCode(), outcome.body(), false);
        } catch (Exception ex) {
            store.remove(key);
            throw ex;
        }
    }

    private String hashPayload(String payload) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}`,
      explanation:
        "High-performance Java implementation utilizing ConcurrentHashMap.compute for atomic, lock-free key reservation without global synchronized locks.",
      keyDecisions: [
        "ConcurrentHashMap.compute atomic step guarantees no race conditions between check and insertion.",
        "Java records for immutable result transfer.",
      ],
      complexityNotes: "Lock-free atomic concurrency.",
    },
  },

  edgeCases: [
    {
      scenario: "Worker Crash during IN_PROGRESS",
      consequence:
        "The server crashes while processing. The record remains stuck in 'IN_PROGRESS' indefinitely, blocking all future retries from the customer.",
      solution:
        "Attach an expiration lease (e.g., 2 minutes) to the IN_PROGRESS state. If a retry arrives and now() > created_at + lease_time, assume prior worker died and allow re-execution.",
    },
    {
      scenario: "Client Re-using Key with Different Currency",
      consequence:
        "A buggy client reuses key 'tx_123' for a $1,000 transaction after using it for a $10 transaction.",
      solution:
        "Always calculate and verify the SHA-256 fingerprint of the request payload. Return HTTP 422 immediately if the key matches but payload differs.",
    },
    {
      scenario: "Primary Database Failover during Write",
      consequence:
        "Idempotency record is written to Redis, but primary DB fails to commit. Client retries, sees Redis says 'IN_PROGRESS', but DB has no record.",
      solution:
        "Store idempotency records in the same relational database and transaction as the business mutation whenever strict ACID guarantees are required.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Idempotency Table Bloat",
        description:
          "High-volume payment platforms accumulate tens of millions of idempotency records per week, degrading database query performance.",
        mitigation:
          "Partition idempotency tables by date (e.g. range partitioning) and drop partitions older than 7 days, or enforce automatic Redis TTLs.",
      },
      {
        title: "Double Charging via Secondary Non-Idempotent Call",
        description:
          "The internal service is idempotent, but calls an external third-party bank API that does not support idempotency keys.",
        mitigation:
          "Wrap external bank call in an inquiry-before-execute pattern, or store the bank transaction reference token before executing.",
      },
    ],
    scaling10x: [
      "Offload completed idempotency response storage from PostgreSQL to Redis or DynamoDB with native TTL auto-deletion.",
      "Employ lightweight SHA-256 Bloom filters to quickly determine if an idempotency key is definitely new before querying persistent storage.",
    ],
    concurrencyRaceConditions: [
      "Concurrent arrival: Two requests with the identical key hit two different gateway pods within 1 millisecond. Must enforce database UNIQUE constraint or Redis SET NX PX.",
    ],
    observability: {
      metrics: [
        "idempotency_requests_total{status='fresh|replayed|conflict|mismatch'}",
        "idempotency_cache_hit_ratio",
      ],
      logs: [
        "Log INFO with 'Idempotent response replayed' containing original_created_at and elapsed_time.",
      ],
      traces: [
        "Tag span with 'idempotency.replayed = true' when short-circuiting handler logic.",
      ],
    },
    securityNotes: [
      "Include tenant_id or user_id in the compound uniqueness constraint to prevent malicious cross-user idempotency key collision attacks.",
    ],
  },

  tradeoffs: [
    {
      approach: "RDBMS Same-Transaction Table",
      advantages: "Guarantees 100% ACID consistency; zero desynchronization between business state and idempotency state.",
      disadvantages: "Increases primary database write IOPS; requires relational storage schema.",
      useWhen: "Financial ledgers, payment transactions, and mission-critical state mutations.",
    },
    {
      approach: "Redis Distributed Key Store",
      advantages: "Sub-millisecond latency; offloads write traffic from database; built-in TTL eviction.",
      disadvantages: "Non-transactional coupling: Redis write and DB write can desynchronize on crash.",
      useWhen: "High-volume notifications, webhooks, or secondary service integrations.",
    },
  ],

  furtherReading: [
    {
      title: "Designing Robust and Idempotent APIs with Stripe",
      type: "Blog",
      authorOrOrg: "Stripe Engineering",
      description: "The gold-standard architectural review of Idempotency-Key headers in financial infrastructure.",
      url: "https://stripe.com/blog/idempotency",
    },
    {
      title: "IETF Draft: The Idempotency-Key HTTP Header Field",
      type: "RFC",
      authorOrOrg: "IETF HTTP Working Group",
      description: "Standardized specification proposal for HTTP idempotency headers.",
      url: "https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/",
    },
  ],
};
