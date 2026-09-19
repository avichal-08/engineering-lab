import { Concept } from "./types";

export const decisionTrees: Concept = {
  slug: "decision-trees",
  title: "Decision Trees",
  shortDescription:
    "Recursively partition feature space into orthogonal axis-aligned rectangular hypercubes using information-theoretic split criteria.",
  category: "Machine Learning",
  track: "Machine Learning",
  difficulty: "Beginner",
  estimatedTime: "~20 min",
  topics: [
    "Recursive Binary Splitting",
    "Gini Impurity & Shannon Entropy",
    "Information Gain",
    "Classification and Regression Trees (CART)",
    "Cost-Complexity Pruning",
    "The Bias-Variance Tradeoff",
  ],

  overview: {
    problemStatement:
      "Engineers frequently encounter non-linear, mixed-type (categorical and numeric) data with threshold-triggered behaviors—such as memory exceeding 90% triggering OOM failures. Decision trees learn non-linear hierarchical decision rules directly from data, producing explainable models that require zero feature scaling.",
    whenToUse: [
      "Tabular engineering telemetry with mixed categorical and continuous features.",
      "High-stakes regulated applications (credit lending, healthcare diagnostics) requiring transparent, explainable decision trees.",
      "Non-linear feature interactions where features trigger actions only in conjunction (e.g. if CPU > 85% AND Disk_IOPS > 2000).",
      "Building blocks for ensemble algorithms like Random Forests and Gradient Boosted Decision Trees (XGBoost, LightGBM).",
    ],
    whenNotToUse: [
      "Unstructured data (raw audio, images, natural language text; use Deep Learning / CNNs / Transformers).",
      "Extremely smooth linear relationships (trees approximate smooth diagonals with staircase step functions).",
      "Online continuous streaming data requiring micro-updates per sample (trees require batch retraining).",
    ],
    coreInvariant:
      "Every internal decision node selects the feature j and split threshold θ that maximizes the reduction in impurity (Information Gain): ΔI = I_parent - (N_left/N · I_left + N_right/N · I_right), dividing the feature space into two orthogonal sub-regions.",
  },

  whyItExists: {
    realWorldProblem:
      "Linear and logistic models fail when features exhibit threshold-dependent non-linear behavior. For example, server response latency is flat from 1 to 500 connections, then abruptly spikes at 501 connections when thread pools exhaust. A decision tree captures this discontinuous step-function natively in a single split: `if connections > 500`.",
    catastrophicScenario:
      "A site reliability team trains an unconstrained decision tree on historical incident logs to predict Kubernetes node evictions. The tree is configured with `max_depth = None` and `min_samples_leaf = 1`. The tree grows to depth 28, creating isolated single-sample leaf nodes that memorize specific ephemeral container IDs and timestamp noise. In production, unseen container traffic triggers random tree branches, leading to a 40% eviction misclassification rate and cascading pod re-scheduling storms.",
    systemImpact: [
      "Catastrophic overfitting: memorizing training noise and failing on unseen holdout traffic.",
      "High variance: slight changes in training data produce radically different tree topologies.",
      "Axis-aligned limitation: requires hundreds of staircase cuts to approximate diagonal boundaries.",
      "Greedy myopia: locally optimal greedy splits can miss globally superior joint feature splits.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "The CART (Classification and Regression Trees) algorithm constructs a binary tree top-down through greedy recursive binary splitting.",
      "At each node, the algorithm evaluates all available features j and candidate split thresholds θ. For each candidate, it calculates the impurity metric of the resulting child partitions.",
      "Common impurity metrics include Gini Impurity: G = 1 - ∑ pₖ² (probability of misclassifying a randomly chosen element), and Shannon Entropy: H = - ∑ pₖ log₂(pₖ).",
      "The split that yields the maximum Information Gain (largest decrease in impurity) is selected. The process recurses on child nodes until a stopping criterion (max_depth, min_samples_split) is triggered.",
    ],
    singleVsDistributed:
      "Single decision trees train rapidly on CPU cores via vectorized feature binning (histogram-based algorithms). In distributed settings (Spark MLlib / Ray), workers compute local feature histograms per partition and communicate summary bin counts to the coordinator node to determine optimal split points without exchanging raw records.",
    semanticsAndGuarantees: [
      "Scale Invariance: Monotonic transformations of features (e.g. log(x), scaling by 1000) do not change the ranking of split thresholds. Zero normalization or standardization is required.",
      "Zero Inductive Bias for Smoothness: Trees model step functions; they cannot extrapolate beyond the minimum and maximum feature values observed during training.",
      "Pruning Guarantee: Cost-Complexity Pruning (Weakest Link Pruning) balances tree size |T| against misclassification error R(T) via cost function R_α(T) = R(T) + α|T|.",
    ],
    keyAlgorithms: [
      {
        name: "CART (Classification and Regression Trees)",
        description:
          "Constructs strictly binary trees using Gini impurity for classification and variance reduction for regression.",
        pros: "Fast binary traversal; handles continuous and categorical features; basis of modern GBDTs.",
        cons: "Greedy splits can lead to sub-optimal tree structures.",
      },
      {
        name: "ID3 / C4.5",
        description:
          "Predecessor algorithms developed by Ross Quinlan using Information Gain (Entropy) and Gain Ratio with multi-way branching.",
        pros: "Historical foundation; elegant information-theoretic grounding.",
        cons: "Biased toward features with many distinct categorical values (fixed by Gain Ratio).",
      },
      {
        name: "Random Forest / ExtraTrees",
        description:
          "Ensemble of hundreds of deep decision trees trained with bootstrap aggregating (bagging) and random feature subspace selection.",
        pros: "Dramatically reduces tree variance; among the most robust off-the-shelf tabular ML models.",
        cons: "Loses single-tree explainability; higher inference latency.",
      },
    ],
  },

  visualizerType: "decision-trees",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Calculate Node Impurity (Gini / Entropy)",
      summary: "Measure class distribution disorder within a subset of samples.",
      explanation:
        "For a node containing samples with class proportions p = [p₀, p₁], Gini is 1 - ∑ pᵢ². A pure node (all class 0) has Gini = 0.0. A perfectly mixed binary node (50/50) has Gini = 0.5.",
      pseudocode: `def gini_impurity(labels):\n  counts = np.bincount(labels)\n  probs = counts / len(labels)\n  return 1.0 - np.sum(probs ** 2)`,
      considerations: [
        "Gini is computationally faster than Entropy because it avoids expensive log() evaluations.",
      ],
    },
    {
      stepNumber: 2,
      title: "Evaluate Best Split Threshold Across Features",
      summary: "Find the feature and value that minimizes weighted child impurity.",
      explanation:
        "Iterate over each feature j. Sort unique values and test midpoints as candidate thresholds θ. Compute weighted impurity: (N_L/N)·G_L + (N_R/N)·G_R. Select the (j*, θ*) with maximum impurity reduction.",
      pseudocode: `for feature in features:\n  for threshold in midpoints(feature):\n    left, right = split(X, y, feature, threshold)\n    gain = current_gini - weighted_gini(left, right)\n    if gain > best_gain:\n      best_split = (feature, threshold)`,
      considerations: [
        "In production, use histogram binning (e.g. 256 quantile bins) rather than testing all unique values to reduce complexity from O(N log N) to O(N + B).",
      ],
    },
    {
      stepNumber: 3,
      title: "Recurse and Enforce Halting Invariants",
      summary: "Stop splitting when constraints are met to prevent overfitting.",
      explanation:
        "Halt recursion and create a leaf node if: current depth reaches max_depth, sample count < min_samples_split, node impurity is 0 (pure), or information gain < min_impurity_decrease.",
      pseudocode: `if depth >= max_depth or len(y) < min_samples or gini == 0:\n  return LeafNode(predicted_class = mode(y))\nleft_child = build_tree(X_left, y_left, depth + 1)\nright_child = build_tree(X_right, y_right, depth + 1)`,
      considerations: [
        "Always enforce a non-zero min_samples_leaf (e.g. 5) to prevent memorizing single noise points.",
      ],
    },
    {
      stepNumber: 4,
      title: "Inference Traversal",
      summary: "Route query samples down the tree hierarchy.",
      explanation:
        "Start at root node. Evaluate conditional `x[feature] <= threshold`. Traverse left if true, right if false, until reaching a leaf node. Return the stored majority class or probability distribution.",
      considerations: [
        "Tree traversal takes O(depth) operations—typically < 10 pointer dereferences, executing in < 50 nanoseconds.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "decision_tree.py",
      code: `import numpy as np
from typing import Optional

class Node:
    """Represents an internal decision node or terminal leaf."""
    def __init__(self, feature: int = None, threshold: float = None,
                 left: "Node" = None, right: "Node" = None, value: int = None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value

    @property
    def is_leaf(self) -> bool:
        return self.value is not None

class DecisionTreeClassifier:
    """
    Binary Decision Tree Classifier using Gini Impurity and CART splitting.
    """
    def __init__(self, max_depth: int = 5, min_samples_split: int = 2):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.root: Optional[Node] = None

    def _gini(self, y: np.ndarray) -> float:
        if len(y) == 0:
            return 0.0
        p = np.bincount(y) / len(y)
        return float(1.0 - np.sum(p ** 2))

    def _best_split(self, X: np.ndarray, y: np.ndarray):
        best_gain = -1.0
        split_idx, split_thresh = None, None
        current_gini = self._gini(y)
        n_samples, n_features = X.shape

        for feat in range(n_features):
            thresholds = np.unique(X[:, feat])
            for thresh in thresholds:
                left_mask = X[:, feat] <= thresh
                right_mask = ~left_mask
                if np.sum(left_mask) == 0 or np.sum(right_mask) == 0:
                    continue

                w_left = np.sum(left_mask) / n_samples
                w_right = 1.0 - w_left
                gain = current_gini - (w_left * self._gini(y[left_mask]) + w_right * self._gini(y[right_mask]))

                if gain > best_gain:
                    best_gain = gain
                    split_idx = feat
                    split_thresh = thresh

        return split_idx, split_thresh

    def _build_tree(self, X: np.ndarray, y: np.ndarray, depth: int = 0) -> Node:
        n_samples = len(y)
        # Check stopping criteria
        if (depth >= self.max_depth or n_samples < self.min_samples_split or self._gini(y) == 0):
            leaf_value = int(np.bincount(y).argmax()) if n_samples > 0 else 0
            return Node(value=leaf_value)

        feat, thresh = self._best_split(X, y)
        if feat is None:
            return Node(value=int(np.bincount(y).argmax()))

        left_mask = X[:, feat] <= thresh
        left_node = self._build_tree(X[left_mask], y[left_mask], depth + 1)
        right_node = self._build_tree(X[~left_mask], y[~left_mask], depth + 1)
        return Node(feature=feat, threshold=thresh, left=left_node, right=right_node)

    def fit(self, X: np.ndarray, y: np.ndarray) -> "DecisionTreeClassifier":
        X = np.asarray(X, dtype=np.float64)
        y = np.asarray(y, dtype=np.int32)
        self.root = self._build_tree(X, y)
        return self

    def _predict_one(self, x: np.ndarray, node: Node) -> int:
        if node.is_leaf:
            return node.value
        if x[node.feature] <= node.threshold:
            return self._predict_one(x, node.left)
        return self._predict_one(x, node.right)

    def predict(self, X: np.ndarray) -> np.ndarray:
        X = np.asarray(X, dtype=np.float64)
        return np.array([self._predict_one(row, self.root) for row in X])`,
      explanation:
        "Full from-scratch CART decision tree implementation in Python using recursive Node pointers and Gini impurity optimization.",
      keyDecisions: [
        "Recursive tree construction with clean Node object encapsulation.",
        "Bounded by max_depth and min_samples_split to prevent unchecked high-variance growth.",
      ],
      complexityNotes:
        "Training: O(depth · N · d log N). Inference: O(depth) where depth ≤ 10, executing in sub-microsecond time.",
    },

    typescript: {
      filename: "DecisionTree.ts",
      code: `export interface Node {
  feature?: number;
  threshold?: number;
  value?: number;
  left?: Node;
  right?: Node;
}

export class DecisionTreeInference {
  constructor(private readonly root: Node) {}

  public predict(features: number[]): number {
    let curr = this.root;
    while (curr.value === undefined) {
      if (curr.feature === undefined || curr.threshold === undefined) {
        throw new Error("Corrupted tree node.");
      }
      if (features[curr.feature] <= curr.threshold) {
        curr = curr.left!;
      } else {
        curr = curr.right!;
      }
    }
    return curr.value;
  }
}`,
      explanation:
        "High-throughput TypeScript tree traversal engine designed to score pre-compiled decision trees at sub-microsecond edge speeds.",
      keyDecisions: [
        "Iterative while loop eliminates recursive call stack overhead in JavaScript runtimes.",
      ],
      complexityNotes:
        "Inference: O(depth) time, O(1) memory.",
    },
  },

  edgeCases: [
    {
      scenario: "Severe Overfitting on Noisy Data (Depth Explosion)",
      consequence:
        "With unlimited depth, the tree creates specialized branches isolating single training outliers, hitting 100% training accuracy while validation performance collapses.",
      solution:
        "Constrain max_depth (e.g. 3 to 6), set min_samples_leaf ≥ 10, or apply cost-complexity pruning.",
    },
    {
      scenario: "Continuous Diagonal Boundary (Staircase Defect)",
      consequence:
        "Because decision trees split exclusively on single axis-aligned features (x₁ <= θ), approximating a diagonal boundary y = x requires hundreds of stair-step rectangular cuts.",
      solution:
        "Perform Principal Component Analysis (PCA) rotation before fitting, or switch to Oblique Decision Trees / SVMs.",
    },
    {
      scenario: "High Cardinality Categorical Features",
      consequence:
        "Features like User_ID or Zipcode have thousands of distinct values. Trees heavily favor these features because they yield high apparent information gain by memorizing specific IDs.",
      solution:
        "Apply Target Encoding or group rare categories before tree ingestion.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "High Variance Instability",
        description:
          "Adding a handful of new training rows completely shifts the root split, restructuring the entire downstream decision tree.",
        mitigation:
          "Do not deploy single unpruned decision trees to production; ensemble them into Random Forests or Gradient Boosted Trees (LightGBM).",
      },
      {
        title: "Out-of-Distribution Extrapolation Blindness",
        description:
          "Tree encounters feature values far beyond the training range (e.g. Traffic = 1,000,000 when max training was 10,000); tree naively assigns the value of the nearest leaf node.",
        mitigation:
          "Instrument input bounds validation; flag out-of-range inference requests for manual inspection or linear fallback.",
      },
    ],
    scaling10x: [
      "Compile decision trees into native C/Rust conditional branch code (or Treelite / ONNX) to eliminate pointer dereferences and leverage CPU branch prediction.",
      "Use histogram-based binning (LightGBM style): quantize continuous features into 256 uint8 bins, reducing memory by 8x and accelerating split evaluations via integer histograms.",
    ],
    concurrencyRaceConditions: [
      "Serving trees concurrently across worker threads is natively safe because inference is read-only. For hot model reloading, use atomic pointer swap (RCU pattern) to replace the root node without locking.",
    ],
    observability: {
      metrics: [
        "tree_leaf_depth_distribution (histogram)",
        "tree_prediction_time_nanoseconds (gauge)",
        "tree_leaf_node_hit_counter{leaf_id} (counter)",
      ],
      logs: [
        "Log anomaly when 90% of production traffic funnels into a single leaf node (feature drift alert).",
      ],
      traces: [
        "OpenTelemetry span capturing leaf node ID and path traversal depth.",
      ],
    },
    securityNotes: [
      "Rule Extraction Attacks: Because decision trees use clear axis-aligned boundaries, an attacker querying the API can rapidly reverse-engineer the exact rules of the fraud detection system.",
    ],
  },

  tradeoffs: [
    {
      approach: "Single Decision Tree",
      advantages: "100% human interpretable; zero feature scaling needed; sub-microsecond inference.",
      disadvantages: "Prone to high variance and overfitting; poor diagonal boundary approximation.",
      useWhen: "Credit scoring, medical triage, and regulatory environments mandating audited decision trees.",
    },
    {
      approach: "Random Forest (Bagging)",
      advantages: "Greatly reduces variance; robust to noise and outliers; excellent out-of-the-box performance.",
      disadvantages: "Higher memory footprint; higher latency (evaluating 200 trees); opaque black box.",
      useWhen: "Tabular datasets where maximum predictive stability is desired without hyperparameter tuning.",
    },
    {
      approach: "Gradient Boosted Trees (XGBoost / LightGBM)",
      advantages: "State-of-the-art accuracy on tabular data; sequential error correction minimizes bias.",
      disadvantages: "Sensitive to hyperparameters and learning rate; prone to overfitting if not tuned.",
      useWhen: "Competitive tabular benchmarks, recommendation rankers, and ad-click prediction.",
    },
  ],

  furtherReading: [
    {
      title: "Classification and Regression Trees",
      type: "Book",
      authorOrOrg: "Leo Breiman, Jerome Friedman, Richard Olshen, Charles Stone",
      description: "The seminal 1984 text establishing the CART methodology and pruning theory.",
      url: "https://www.routledge.com/Classification-and-Regression-Trees/Breiman-Friedman-Stone-Olshen/p/book/9780412048418",
    },
    {
      title: "LightGBM: A Highly Efficient Gradient Boosting Decision Tree",
      type: "Paper",
      authorOrOrg: "Guolin Ke et al. (NeurIPS 2017)",
      description: "How histogram binning and exclusive feature bundling enable orders-of-magnitude faster tree learning.",
      url: "https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree.pdf",
    },
  ],
};
