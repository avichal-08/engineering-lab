import { Concept } from "./types";
import { rateLimiting } from "./rate-limiting";
import { circuitBreaker } from "./circuit-breaker";
import { retries } from "./retries";
import { idempotency } from "./idempotency";
import { caching } from "./caching";
import { messageQueues } from "./message-queues";
import { pubSub } from "./pub-sub";
import { consistentHashing } from "./consistent-hashing";
import { distributedLock } from "./distributed-lock";
import { replicationQuorum } from "./replication-quorum";

export * from "./types";

export const concepts: Concept[] = [
  rateLimiting,
  circuitBreaker,
  retries,
  idempotency,
  caching,
  messageQueues,
  pubSub,
  consistentHashing,
  distributedLock,
  replicationQuorum,
];

export function getAllConcepts(): Concept[] {
  return concepts;
}

export function getConceptBySlug(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}

export function getAllSlugs(): string[] {
  return concepts.map((c) => c.slug);
}
