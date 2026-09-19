import { Concept } from "./types";

export const classification: Concept = {
  slug: "classification",
  title: "Classification & Decision Boundaries",
  shortDescription:
    "Partition feature spaces into discrete category regions using linear decision hyperplanes and non-parametric neighborhood boundaries.",
  category: "Machine Learning",
  track: "Machine Learning",
  difficulty: "Beginner",
  estimatedTime: "~25 min",
  topics: [
    "Logistic Regression",
    "Binary Cross-Entropy (Log-Loss)",
    "Decision Boundaries",
    "Confusion Matrix (TP, FP, TN, FN)",
    "Precision-Recall Trade-off",
    "Class Imbalance & Bayes Error",
  ],

  overview: {
    problemStatement:
      "Unlike regression which predicts continuous scalar values, classification assigns observations to discrete categorical classes (e.g. spam vs ham, fraudulent vs legitimate transaction, benign vs malignant). The engineering challenge is learning optimal decision boundaries that maximize classification utility while tolerating noise and class imbalance.",
    whenToUse: [
      "Discrete decision-making pipelines: fraud detection, content moderation, network intrusion detection.",
      "Calibrated probability estimation: calculating the risk score (P(y=1|x)) that an infrastructure node will experience hardware failure within 24 hours.",
      "Multi-class categorization: routing customer support tickets to appropriate specialized service teams.",
    ],
    whenNotToUse: [
      "Predicting continuous numerical quantities without predefined thresholds (use Linear Regression).",
      "Rank ordering search results where relative pairwise relevance matters more than class membership (use Learning-to-Rank).",
      "Novelty or anomaly detection with virtually zero labeled positive examples (use One-Class SVM or Isolation Forests).",
    ],
    coreInvariant:
      "A classification decision boundary represents the geometric locus of points in feature space where the posterior class probability P(y=1|x) equals the decision threshold τ (default τ = 0.5; wᵀx + b = 0 for linear models).",
  },

  whyItExists: {
    realWorldProblem:
      "Using linear regression for binary classification fails because linear predictions are unbounded (-∞ to +∞), violating probability axioms. Furthermore, points placed far into the correct side of the boundary act as high-leverage outliers that distort the separating line, degrading accuracy near the decision threshold.",
    catastrophicScenario:
      "A fintech credit card fraud pipeline optimizes an unweighted classifier using standard Accuracy on a dataset with 99.9% legitimate transactions and 0.1% fraud. The trained model learns a trivial majority classifier that outputs 'Legitimate' for every card swipe. The monitoring dashboard displays 99.9% Accuracy. The business incurs $14M in fraudulent chargebacks over the weekend with zero alerts fired, because Recall on the fraud class was precisely 0.0%.",
    systemImpact: [
      "The Accuracy Paradox: deceptively high accuracy masking zero recall on rare critical events.",
      "Threshold misalignment causing excessive false positives that overwhelm human fraud review teams.",
      "Severe boundary shift under covariate drift, misclassifying emerging fraud patterns.",
      "Bayes error rate limits: inability to separate intrinsically overlapping feature distributions.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Logistic regression passes the linear combination z = wᵀx + b through the non-linear Sigmoid function: σ(z) = 1 / (1 + e⁻ᶻ), mapping any real number to a calibrated probability p ∈ (0, 1).",
      "The model is trained by minimizing Binary Cross-Entropy (Log-Loss): L(w, b) = - (1/n) ∑ [ yᵢ ln(pᵢ) + (1 - yᵢ) ln(1 - pᵢ) ]. Log-Loss heavily penalizes confident wrong predictions (e.g. predicting p=0.001 when true y=1 incurs huge loss).",
      "The decision boundary is the hyperplane defined by wᵀx + b = ln(τ / (1 - τ)). For default threshold τ = 0.5, this simplifies to the hyperplane wᵀx + b = 0.",
    ],
    singleVsDistributed:
      "For small to medium tabular datasets, Logistic Regression trains in seconds via L-BFGS or Newton-Raphson (IRLS) on a single CPU core. In massive ad-tech click-through-rate (CTR) prediction with billions of sparse one-hot features, models are trained across distributed clusters using Downpour SGD or parameter servers with FTRL-Proximal (Follow-the-Regularized-Leader).",
    semanticsAndGuarantees: [
      "Convexity: Binary Cross-Entropy with logistic sigmoid is strictly convex with respect to w; gradient descent is guaranteed to find the global optimum.",
      "Well-Calibrated Probabilities: Under maximum likelihood estimation, the predicted probabilities match true empirical event frequencies in the limit.",
      "Non-Parametric KNN: K-Nearest Neighbors requires no training phase (lazy learning) and learns arbitrary non-linear boundaries by majority voting among the k closest training points in Euclidean space.",
    ],
    keyAlgorithms: [
      {
        name: "Logistic Regression (Linear Parametric)",
        description:
          "Fits a linear boundary wᵀx + b = 0 using gradient descent on cross-entropy loss. Outputs calibrated class probabilities.",
        pros: "Fast O(d) inference; highly interpretable odds-ratio coefficients; convex optimization.",
        cons: "Can only produce linear (flat) decision boundaries without manual polynomial feature engineering.",
      },
      {
        name: "K-Nearest Neighbors (KNN - Non-Parametric)",
        description:
          "Assigns class by querying the k nearest points in feature space and taking a plurality vote.",
        pros: "Zero training time; learns arbitrarily complex non-linear boundaries without assumptions.",
        cons: "Inference scales with O(N·d); severely degraded by high dimensionality (curse of dimensionality).",
      },
      {
        name: "Support Vector Machines (SVM with RBF Kernel)",
        description:
          "Maximizes the geometric margin between classes using support vectors and projects features into infinite-dimensional Hilbert space.",
        pros: "Effective in high-dimensional spaces; robust against non-support vector outliers.",
        cons: "O(N²) to O(N³) training complexity; does not output native calibrated probabilities.",
      },
    ],
  },

  visualizerType: "classification",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Sigmoid & Forward Probability Calculation",
      summary: "Map unbounded linear dot products into probabilities.",
      explanation:
        "Evaluate z = wᵀx + b and compute p = 1 / (1 + exp(-clip(z, -15, 15))). Clipping prevents floating point overflow in exp(-z).",
      pseudocode: `def sigmoid(z):\n  z = np.clip(z, -15.0, 15.0)\n  return 1.0 / (1.0 + np.exp(-z))`,
      considerations: [
        "Numerical underflow: using exp(-z) directly can cause overflow when z < -700.",
      ],
    },
    {
      stepNumber: 2,
      title: "Compute Binary Cross-Entropy Loss & Gradients",
      summary: "Derive gradients of Log-Loss with respect to parameters.",
      explanation:
        "Remarkably, the gradient of Binary Cross-Entropy with Sigmoid has the exact same clean mathematical form as linear regression: ∇_w L = (1/n) Xᵀ(p - y), where p is predicted probability.",
      pseudocode: `error = probas - y\ngrad_w = (1.0 / n) * (X.T @ error)\ngrad_b = (1.0 / n) * np.sum(error)`,
      considerations: [
        "Add epsilon (1e-15) inside log terms to prevent log(0) NaN errors.",
      ],
    },
    {
      stepNumber: 3,
      title: "Calculate Confusion Matrix & Derived Metrics",
      summary: "Compute True Positives, False Positives, False Negatives, and True Negatives.",
      explanation:
        "Classify samples with threshold τ: pred = (prob >= threshold). Compute Precision = TP / (TP + FP), Recall = TP / (TP + FN), and F1 = 2·P·R / (P + R).",
      pseudocode: `tp = np.sum((pred == 1) & (y == 1))\nfp = np.sum((pred == 1) & (y == 0))\nfn = np.sum((pred == 0) & (y == 1))\ntn = np.sum((pred == 0) & (y == 0))`,
      considerations: [
        "Handle division by zero when TP + FP = 0 or TP + FN = 0.",
      ],
    },
    {
      stepNumber: 4,
      title: "Tune Decision Threshold for Business Costs",
      summary: "Adjust classification cutoff τ based on asymmetric error penalties.",
      explanation:
        "In fraud detection, a False Negative (missing $10,000 fraud) is 100x more costly than a False Positive (sending an SMS verification). Lower τ from 0.5 to 0.15 to maximize Recall at the cost of lower Precision.",
      considerations: [
        "Plot Precision-Recall curves or ROC curves to select optimal operational operating points.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "classifier.py",
      code: `import numpy as np
from typing import Dict, Tuple

class LogisticRegression:
    """
    Vectorized Binary Logistic Regression using Batch Gradient Descent.
    """
    def __init__(self, lr: float = 0.1, max_iter: int = 500, threshold: float = 0.5):
        self.lr = lr
        self.max_iter = max_iter
        self.threshold = threshold
        self.weights: np.ndarray = None
        self.bias: float = 0.0

    def fit(self, X: np.ndarray, y: np.ndarray) -> "LogisticRegression":
        X = np.asarray(X, dtype=np.float64)
        y = np.asarray(y, dtype=np.float64).reshape(-1, 1)
        n_samples, n_features = X.shape

        self.weights = np.zeros((n_features, 1))
        self.bias = 0.0

        for _ in range(self.max_iter):
            # Forward pass: z = Xw + b, p = sigmoid(z)
            z = (X @ self.weights) + self.bias
            z_clipped = np.clip(z, -15.0, 15.0)
            p = 1.0 / (1.0 + np.exp(-z_clipped))

            # Gradients
            error = p - y
            grad_w = (1.0 / n_samples) * (X.T @ error)
            grad_b = float((1.0 / n_samples) * np.sum(error))

            # Update
            self.weights -= self.lr * grad_w
            self.bias -= self.lr * grad_b

        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Returns calibrated probability P(y=1|x)."""
        z = (X @ self.weights) + self.bias
        z_clipped = np.clip(z, -15.0, 15.0)
        return (1.0 / (1.0 + np.exp(-z_clipped))).ravel()

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Returns discrete binary prediction based on decision threshold."""
        return (self.predict_proba(X) >= self.threshold).astype(np.int32)

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Computes Precision, Recall, Accuracy, and F1 Score."""
        preds = self.predict(X)
        y_true = np.asarray(y, dtype=np.int32).ravel()

        tp = int(np.sum((preds == 1) & (y_true == 1)))
        fp = int(np.sum((preds == 1) & (y_true == 0)))
        fn = int(np.sum((preds == 0) & (y_true == 1)))
        tn = int(np.sum((preds == 0) & (y_true == 0)))

        acc = (tp + tn) / max(1, len(y_true))
        prec = tp / max(1, (tp + fp))
        rec = tp / max(1, (tp + fn))
        f1 = 2 * (prec * rec) / max(1e-9, (prec + rec))

        return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1}`,
      explanation:
        "High-performance vectorized NumPy implementation. Demonstrates numerical safety via exponential clipping and computes full confusion matrix metrics.",
      keyDecisions: [
        "Clamped linear logits z to [-15, 15] to prevent float overflow in exp(-z).",
        "Included configurable decision threshold parameter for cost-sensitive optimization.",
      ],
      complexityNotes:
        "Training: O(epochs · N · d). Inference: O(d) matrix-vector dot product taking < 20ns.",
    },

    typescript: {
      filename: "KNNClassifier.ts",
      code: `export interface DataPoint {
  features: number[];
  label: number;
}

export class KNNClassifier {
  private trainingData: DataPoint[] = [];

  constructor(private readonly k: number = 3) {}

  public fit(data: DataPoint[]): void {
    this.trainingData = data;
  }

  public predict(features: number[]): number {
    if (this.trainingData.length === 0) {
      throw new Error("Model has not been trained.");
    }

    // Compute Euclidean distance to all training samples
    const distances = this.trainingData.map((pt) => {
      let sumSq = 0;
      for (let i = 0; i < features.length; i++) {
        const diff = features[i] - pt.features[i];
        sumSq += diff * diff;
      }
      return { dist: Math.sqrt(sumSq), label: pt.label };
    });

    // Sort by ascending distance and take top K
    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, Math.min(this.k, distances.length));

    // Majority vote
    const votes: Record<number, number> = {};
    for (const item of topK) {
      votes[item.label] = (votes[item.label] || 0) + 1;
    }

    let maxVotes = -1;
    let bestLabel = 0;
    for (const [lbl, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        bestLabel = parseInt(lbl, 10);
      }
    }

    return bestLabel;
  }
}`,
      explanation:
        "TypeScript implementation of non-parametric K-Nearest Neighbors illustrating non-linear decision voting directly in the browser.",
      keyDecisions: [
        "Computes Euclidean distance across arbitrary feature vector lengths.",
        "Uses majority voting dictionary to break multi-class ties.",
      ],
      complexityNotes:
        "Training: O(1) lazy storage. Prediction: O(N · d + N log N) distance calculations.",
    },
  },

  edgeCases: [
    {
      scenario: "Extreme Class Imbalance (e.g. 99.9% / 0.1%)",
      consequence:
        "Standard loss minimization results in a dummy majority classifier with high accuracy but 0% recall on the rare target class.",
      solution:
        "Use class-weighted loss (scale minority class loss by N_majority / N_minority), tune decision threshold τ, or apply SMOTE / Focal Loss.",
    },
    {
      scenario: "Linearly Inseparable Data with Bayes Error Overlap",
      consequence:
        "True data distributions physically overlap in feature space. No boundary can achieve 100% accuracy without overfitting noise.",
      solution:
        "Accept irreducible Bayes error, engineer non-linear features, or collect additional orthogonal signals that separate the overlapping clusters.",
    },
    {
      scenario: "Perfect Linear Separation (Separation Invariant)",
      consequence:
        "If classes are completely separable, weights w grow toward ±infinity to push Sigmoid outputs to exactly 0 and 1, causing floating-point overflow.",
      solution:
        "Apply L2 regularization (Ridge penalty λ ||w||²) which bounds weight magnitudes strictly.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Threshold Misalignment in Production",
        description:
          "Model trained with default threshold τ = 0.5 produces an intolerable surge of false alerts when deployed to production traffic.",
        mitigation:
          "Never hardcode threshold 0.5; expose classification threshold as a dynamic configuration flag adjustable via feature flags without redeployment.",
      },
      {
        title: "Probability Miscalibration under Covariate Shift",
        description:
          "Model predicts probability 0.90, but empirical event rate is only 40% due to demographic or system traffic shifts.",
        mitigation:
          "Apply Platt Scaling or Isotonic Regression calibration on holdout validation data; monitor Expected Calibration Error (ECE).",
      },
    ],
    scaling10x: [
      "In high-throughput microservices (>50k RPS), precompute logistic weights into fixed-point integer dot products or deploy compiled C++ kernels with AVX-512 vectorization.",
      "For KNN on large datasets, replace naive linear scan O(N) with Approximate Nearest Neighbors (ANN) indexing using Hierarchical Navigable Small World (HNSW) graphs (e.g. Faiss / Milvus).",
    ],
    concurrencyRaceConditions: [
      "When logging live predictions for active learning retraining, asynchronous out-of-order event delivery can associate labels with wrong model version inference IDs; log immutable prediction UUIDs with feature vectors.",
    ],
    observability: {
      metrics: [
        "classifier_prediction_class_distribution{class_id} (counter)",
        "classifier_confidence_histogram (histogram)",
        "classifier_fallback_invocations_total (counter)",
      ],
      logs: [
        "Structured log on high-uncertainty predictions (0.45 < p < 0.55) to feed active learning labeling queues.",
      ],
      traces: [
        "OpenTelemetry span for 'classifier.score' with duration and predicted category tags.",
      ],
    },
    securityNotes: [
      "Adversarial evasion attacks: Attackers add imperceptible perturbations to input features that flip predicted class while remaining indistinguishable to human auditors.",
    ],
  },

  tradeoffs: [
    {
      approach: "Logistic Regression",
      advantages: "Fastest scoring (<20ns); output calibrated probabilities; highly interpretable coefficients.",
      disadvantages: "Cannot model non-linear boundaries or feature interactions without manual feature engineering.",
      useWhen: "Latency-critical API serving and regulated applications requiring auditability.",
    },
    {
      approach: "K-Nearest Neighbors (KNN)",
      advantages: "Naturally models complex non-linear manifolds; zero training overhead.",
      disadvantages: "Extremely slow inference O(N); memory scales with dataset size; fails in high dimensions.",
      useWhen: "Small datasets (<5,000 samples) with non-linear clustering and low inference frequency.",
    },
    {
      approach: "Gradient Boosted Trees (XGBoost / LightGBM)",
      advantages: "State-of-the-art tabular accuracy; handles missing values and non-linearities automatically.",
      disadvantages: "Higher inference latency (~1-5ms); opaque decision structures.",
      useWhen: "Tabular business data where accuracy supersedes sub-microsecond latency.",
    },
  ],

  furtherReading: [
    {
      title: "Logistic Regression and Cross-Entropy Optimization",
      type: "Book",
      authorOrOrg: "Christopher M. Bishop (Pattern Recognition and Machine Learning)",
      description: "Comprehensive mathematical derivation of logistic models and maximum likelihood.",
      url: "https://www.microsoft.com/en-us/research/publication/pattern-recognition-and-machine-learning/",
    },
    {
      title: "A Survey of Predictive Performance in Class Imbalance",
      type: "Paper",
      authorOrOrg: "Haibo He, Edwardo A. Garcia (IEEE TKDE)",
      description: "In-depth analysis of Precision, Recall, ROC-AUC, and sampling remedies for imbalanced datasets.",
      url: "https://ieeexplore.ieee.org/document/5128907",
    },
  ],
};
