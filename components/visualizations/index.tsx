"use client";

import React from "react";
import { RateLimiterViz } from "./rate-limiter-viz";
import { CircuitBreakerViz } from "./circuit-breaker-viz";
import { RetryBackoffViz } from "./retry-backoff-viz";
import { IdempotencyViz } from "./idempotency-viz";
import { CacheViz } from "./cache-viz";
import { QueueViz } from "./queue-viz";
import { PubSubViz } from "./pub-sub-viz";
import { HashRingViz } from "./hash-ring-viz";
import { DistributedLockViz } from "./distributed-lock-viz";
import { ReplicationQuorumViz } from "./replication-quorum-viz";

// Machine Learning Visualizers
import { LinearRegressionViz } from "./linear-regression-viz";
import { GradientDescentViz } from "./gradient-descent-viz";
import { ClassificationViz } from "./classification-viz";
import { KMeansViz } from "./k-means-viz";
import { DecisionTreesViz } from "./decision-trees-viz";

// Deep Learning Visualizers
import { NeuronsViz } from "./neurons-viz";
import { ActivationFunctionsViz } from "./activation-functions-viz";
import { BackpropagationViz } from "./backpropagation-viz";
import { CnnConvolutionViz } from "./cnn-convolution-viz";
import { AttentionViz } from "./attention-viz";

interface VisualizerProps {
  type: string;
}

export function VisualizerDispatcher({ type }: VisualizerProps) {
  switch (type) {
    case "rate-limiter":
      return <RateLimiterViz />;
    case "circuit-breaker":
      return <CircuitBreakerViz />;
    case "retry-backoff":
      return <RetryBackoffViz />;
    case "idempotency":
      return <IdempotencyViz />;
    case "cache":
      return <CacheViz />;
    case "queue":
      return <QueueViz />;
    case "pub-sub":
      return <PubSubViz />;
    case "hash-ring":
      return <HashRingViz />;
    case "distributed-lock":
      return <DistributedLockViz />;
    case "replication-quorum":
      return <ReplicationQuorumViz />;

    // Machine Learning
    case "linear-regression":
      return <LinearRegressionViz />;
    case "gradient-descent":
      return <GradientDescentViz />;
    case "classification":
      return <ClassificationViz />;
    case "k-means":
      return <KMeansViz />;
    case "decision-trees":
      return <DecisionTreesViz />;

    // Deep Learning
    case "neurons":
      return <NeuronsViz />;
    case "activation-functions":
      return <ActivationFunctionsViz />;
    case "backpropagation":
      return <BackpropagationViz />;
    case "convolutional-networks":
      return <CnnConvolutionViz />;
    case "attention":
      return <AttentionViz />;

    default:
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-xs font-mono text-zinc-500">
          Visualizer type &apos;{type}&apos; under development.
        </div>
      );
  }
}
