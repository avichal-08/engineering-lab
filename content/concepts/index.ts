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

// Machine Learning Concepts
import { linearRegression } from "./linear-regression";
import { gradientDescent } from "./gradient-descent";
import { classification } from "./classification";
import { kMeans } from "./k-means";
import { decisionTrees } from "./decision-trees";

// Deep Learning Concepts
import { neurons } from "./neurons";
import { activationFunctions } from "./activation-functions";
import { backpropagation } from "./backpropagation";
import { convolutionalNetworks } from "./cnn-convolution";
import { attentionMechanism } from "./attention-mechanism";

export * from "./types";

export const concepts: Concept[] = [
  // Distributed Systems Track
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

  // Machine Learning Track
  linearRegression,
  gradientDescent,
  classification,
  kMeans,
  decisionTrees,

  // Deep Learning Track
  neurons,
  activationFunctions,
  backpropagation,
  convolutionalNetworks,
  attentionMechanism,
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
