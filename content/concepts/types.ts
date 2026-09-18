export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type Category =
  | "Distributed Systems"
  | "Reliability"
  | "Data"
  | "Messaging"
  | "Infrastructure";
export type Language = "go" | "typescript" | "python" | "java";

export interface BuildStep {
  stepNumber: number;
  title: string;
  summary: string;
  explanation: string;
  pseudocode?: string;
  considerations: string[];
}

export interface CodeImplementation {
  filename: string;
  code: string;
  explanation: string;
  keyDecisions: string[];
  complexityNotes: string;
}

export interface FailureMode {
  title: string;
  description: string;
  mitigation: string;
}

export interface TradeoffRow {
  approach: string;
  advantages: string;
  disadvantages: string;
  useWhen: string;
}

export interface FurtherReading {
  title: string;
  type: "Paper" | "RFC" | "Blog" | "Book";
  authorOrOrg: string;
  description: string;
  url?: string;
}

export interface Concept {
  slug: string;
  title: string;
  shortDescription: string;
  category: Category;
  difficulty: Difficulty;
  estimatedTime: string;
  topics: string[];

  // Section 01: Overview
  overview: {
    problemStatement: string;
    whenToUse: string[];
    whenNotToUse: string[];
    coreInvariant: string;
  };

  // Section 02: Why it exists
  whyItExists: {
    realWorldProblem: string;
    catastrophicScenario: string;
    systemImpact: string[];
  };

  // Section 03: How it works
  howItWorks: {
    theoreticalExplanation: string[];
    singleVsDistributed: string;
    semanticsAndGuarantees: string[];
    keyAlgorithms: {
      name: string;
      description: string;
      pros: string;
      cons: string;
    }[];
  };

  // Section 04: Visualizer identifier
  visualizerType:
    | "rate-limiter"
    | "circuit-breaker"
    | "retry-backoff"
    | "idempotency"
    | "cache"
    | "queue"
    | "pub-sub"
    | "hash-ring"
    | "distributed-lock"
    | "replication-quorum";

  // Section 05: Build steps
  buildSteps: BuildStep[];

  // Section 06: Implementations in 4 languages
  codeImplementations: Record<Language, CodeImplementation>;

  // Section 07: Edge cases
  edgeCases: {
    scenario: string;
    consequence: string;
    solution: string;
  }[];

  // Section 08: Production considerations
  production: {
    failureModes: FailureMode[];
    scaling10x: string[];
    concurrencyRaceConditions: string[];
    observability: {
      metrics: string[];
      logs: string[];
      traces: string[];
    };
    securityNotes: string[];
  };

  // Section 09: Trade-offs
  tradeoffs: TradeoffRow[];

  // Section 10: Further reading
  furtherReading: FurtherReading[];
}
