import { Concept } from "./types";

export const linearRegression: Concept = {
  slug: "linear-regression",
  title: "Linear Regression",
  shortDescription:
    "Fit hyperplanes to multidimensional feature spaces by minimizing quadratic prediction residuals via Ordinary Least Squares and gradient descent.",
  category: "Machine Learning",
  track: "Machine Learning",
  difficulty: "Beginner",
  estimatedTime: "~20 min",
  topics: [
    "Ordinary Least Squares (OLS)",
    "Mean Squared Error (MSE)",
    "Normal Equation",
    "Gradient Descent Optimization",
    "Multicollinearity",
    "Outlier Sensitivity",
  ],

  overview: {
    problemStatement:
      "Modern engineering systems continuously predict continuous real-valued targets—server latency, disk IOPS utilization, financial risk, or cloud compute costs—from observable feature telemetry. Linear regression establishes the optimal affine transformation mapping feature vectors to target values by minimizing scalar residual error.",
    whenToUse: [
      "Predicting continuous metrics where feature effects are approximately additive and monotonic.",
      "High-interpretability domains where each coefficient represents an audit-traceable physical marginal cost.",
      "Ultra-low-latency production scoring (evaluating a dot product wᵀx + b takes < 15 nanoseconds).",
      "Baseline modeling to establish empirical performance lower bounds before deploying deep neural networks.",
    ],
    whenNotToUse: [
      "Complex non-linear relationships with high-order feature interactions without explicit polynomial feature transforms.",
      "Classification problems with bounded categorical outcomes (use Logistic Regression or Softmax).",
      "High-dimensional datasets with severe multicollinearity without L1/L2 regularization (Ridge/Lasso).",
      "Datasets containing heavy-tailed Cauchy noise or extreme leverage outliers without Huber / robust loss formulation.",
    ],
    coreInvariant:
      "The optimal Ordinary Least Squares parameter vector w* ensures that the residual error vector e = y - ŷ is strictly orthogonal to the column space of the feature design matrix X (i.e., Xᵀ(y - Xw*) = 0).",
  },

  whyItExists: {
    realWorldProblem:
      "In capacity engineering, cloud infrastructure teams must estimate database query latency as a function of concurrent worker connections and active memory buffers. Naive heuristics or static thresholds either over-provision expensive server fleets or lead to tail-latency SLA breaches under load spikes.",
    catastrophicScenario:
      "An automated cloud autoscaler uses unregularized linear regression on CPU and request rates to scale container replicas. A single batch scraper injects an extreme leverage outlier (low CPU, massive socket connection count). Because Ordinary Least Squares minimizes squared residuals, the fitted hyperplane pivots violently toward the outlier. The autoscaler predicts zero resource demand during peak shopping hours, shutting down 80% of cluster nodes and inducing a complete site outage.",
    systemImpact: [
      "Quadratic penalty amplification causes extreme vulnerability to data corruptions and anomalies.",
      "Singular matrix inversion failure when collinear features create zero eigenvalues in XᵀX.",
      "Sub-optimal capacity forecasting causing thrashing and severe autoscaling latency cascades.",
      "Silent model drift when underlying system relationships shift from linear to saturated non-linear regimes.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Linear regression models the relationship between dependent scalar y and d-dimensional feature vector x as: ŷ = wᵀx + b = w₁x₁ + w₂x₂ + ... + w_d x_d + b.",
      "The optimization objective is the Mean Squared Error (MSE) loss function: J(w, b) = (1 / 2n) ∑ (yᵢ - (wᵀxᵢ + b))². Because J is a convex quadratic paraboloid, it possesses a unique global minimum with zero local minima traps.",
      "The parameter vector can be solved either analytically in closed form via the Normal Equation: w* = (XᵀX)⁻¹ Xᵀy, or iteratively via Gradient Descent: w ← w - η ∇_w J.",
    ],
    singleVsDistributed:
      "Small to medium datasets (n < 100,000, d < 1,000) fit comfortably in server RAM and are solved in sub-second time via Cholesky or SVD decomposition of the Normal Equation. Massive streaming datasets (billions of events) cannot afford the O(d³) matrix inversion cost and must use Stochastic Gradient Descent (SGD) or distributed parameter servers (AllReduce).",
    semanticsAndGuarantees: [
      "Gauss-Markov Theorem: Under homoscedasticity and uncorrelated zero-mean errors, OLS is the Best Linear Unbiased Estimator (BLUE).",
      "Convexity Guarantee: The Hessian matrix ∇²J = (1/n) XᵀX is positive semi-definite; gradient descent is guaranteed to converge to the global optimum given an appropriately bounded learning rate.",
      "Inference Determinism: Model inference consists of a single vector inner product wᵀx + b, executing in O(d) time with zero branching.",
    ],
    keyAlgorithms: [
      {
        name: "Normal Equation (Closed-Form Analytical Solution)",
        description:
          "Directly computes w* = (XᵀX)⁻¹ Xᵀy by setting the gradient of MSE to zero. Requires no learning rate tuning or iterations.",
        pros: "Exact mathematical solution in a single step; no hyperparameters to tune.",
        cons: "Matrix inversion scales with O(d³); fails if XᵀX is singular (collinear features) or d > 10,000.",
      },
      {
        name: "Batch Gradient Descent (Iterative)",
        description:
          "Iteratively steps parameters down the loss surface using the full dataset gradient: w ← w - η (1/n) Xᵀ(Xw - y).",
        pros: "Scales efficiently to millions of features d; memory footprint is O(nd).",
        cons: "Requires computing gradients over the entire dataset per step; sensitive to learning rate η.",
      },
      {
        name: "Mini-Batch / Stochastic Gradient Descent (SGD)",
        description:
          "Approximates the gradient over small randomized batches (e.g. 64 or 256 samples), allowing continuous online parameter updates.",
        pros: "Fast convergence; constant memory footprint O(batch_size · d); handles streaming real-time telemetry.",
        cons: "Noisy gradient updates cause parameters to oscillate around the minimum rather than landing precisely at zero error.",
      },
      {
        name: "Ridge Regression (L2 Regularization / Tikhonov)",
        description:
          "Adds quadratic parameter penalty λ ||w||² to loss: J_ridge = MSE + λ ∑ wᵢ². Solved via (XᵀX + λI)⁻¹ Xᵀy.",
        pros: "Guarantees (XᵀX + λI) is strictly invertible; suppresses parameter explosion caused by multicollinearity.",
        cons: "Introduces regularization hyperparameter λ; shrinks coefficients toward zero without performing feature selection.",
      },
    ],
  },

  visualizerType: "linear-regression",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Formulate Design Matrix & Target Vector",
      summary: "Construct the homogeneous feature matrix X with an prepended bias intercept column.",
      explanation:
        "To unify slope weights and bias into a single vector dot product, augment the n×d feature matrix with a column of ones: X_aug = [1, X], yielding parameters θ = [b, w₁, ..., w_d]ᵀ.",
      pseudocode: `def prepare_design_matrix(X):\n  n = X.shape[0]\n  return np.hstack([np.ones((n, 1)), X])`,
      considerations: [
        "Feature normalization (Z-score standardization) is critical for gradient descent to avoid ill-conditioned ellipsoidal loss surfaces.",
        "Ensure no missing NaN or infinite values enter the matrix pipeline.",
      ],
    },
    {
      stepNumber: 2,
      title: "Implement Analytical Normal Equation Solver",
      summary: "Solve the linear system using Cholesky or Singular Value Decomposition (SVD).",
      explanation:
        "Directly computing (XᵀX)⁻¹ via naive matrix inversion is numerically unstable. Production libraries solve the least squares problem via QR decomposition or SVD (e.g. scipy.linalg.lstsq) to handle rank-deficient matrices.",
      pseudocode: `def solve_ols(X, y):\n  # Using Moore-Penrose pseudo-inverse for numerical stability\n  return np.linalg.pinv(X.T @ X) @ X.T @ y`,
      considerations: [
        "np.linalg.pinv uses SVD and handles singular or near-singular matrices gracefully by discarding singular values below machine epsilon.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Vectorized Batch Gradient Descent",
      summary: "Compute exact analytical gradient updates across all samples simultaneously.",
      explanation:
        "Vectorized gradient computation eliminates Python loops: residuals = Xw - y, gradient = (1/n) Xᵀ · residuals, update: w ← w - η · gradient.",
      pseudocode: `for epoch in range(max_epochs):\n  residuals = (X @ w) - y\n  grad = (1 / n) * (X.T @ residuals)\n  w -= learning_rate * grad\n  if np.linalg.norm(grad) < tolerance:\n    break`,
      considerations: [
        "Track loss at each iteration; if loss increases, learning rate η is too high and diverging.",
      ],
    },
    {
      stepNumber: 4,
      title: "Add Metric Telemetry: R² Score and RMSE",
      summary: "Evaluate goodness-of-fit and residual variance.",
      explanation:
        "Root Mean Squared Error (RMSE) provides error in the target unit (e.g. milliseconds). The Coefficient of Determination (R²) measures the fraction of variance explained by the model: R² = 1 - SS_res / SS_tot.",
      pseudocode: `def compute_r2(y_true, y_pred):\n  ss_res = np.sum((y_true - y_pred) ** 2)\n  ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)\n  return 1.0 - (ss_res / (ss_tot + 1e-9))`,
      considerations: [
        "R² can be negative if the model performs worse than predicting the horizontal mean line.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "linear_regression.py",
      code: `import numpy as np
from typing import Tuple, Optional

class LinearRegression:
    """
    Production-grade Ordinary Least Squares Linear Regression.
    Supports both analytical Normal Equation (SVD) and Gradient Descent solvers.
    """

    def __init__(self, solver: str = "svd", learning_rate: float = 0.01, max_iter: int = 1000):
        self.solver = solver
        self.learning_rate = learning_rate
        self.max_iter = max_iter
        self.weights: Optional[np.ndarray] = None
        self.bias: float = 0.0

    def fit(self, X: np.ndarray, y: np.ndarray) -> "LinearRegression":
        """
        Fit linear model to training data (X: [n_samples, n_features], y: [n_samples]).
        """
        X = np.asarray(X, dtype=np.float64)
        y = np.asarray(y, dtype=np.float64).reshape(-1, 1)
        n_samples, n_features = X.shape

        if self.solver == "svd":
            # Add bias column of ones
            X_aug = np.hstack([np.ones((n_samples, 1)), X])
            # Moore-Penrose pseudo-inverse handles rank-deficient systems
            theta = np.linalg.pinv(X_aug) @ y
            self.bias = float(theta[0, 0])
            self.weights = theta[1:, 0]
        elif self.solver == "gradient_descent":
            self.weights = np.zeros(n_features, dtype=np.float64)
            self.bias = 0.0

            for _ in range(self.max_iter):
                # Forward prediction: y_hat = Xw + b
                y_pred = (X @ self.weights.reshape(-1, 1)) + self.bias
                error = y_pred - y  # [n_samples, 1]

                # Gradient computations
                grad_w = (1.0 / n_samples) * (X.T @ error).ravel()
                grad_b = float((1.0 / n_samples) * np.sum(error))

                # Gradient descent step
                self.weights -= self.learning_rate * grad_w
                self.bias -= self.learning_rate * grad_b
        else:
            raise ValueError(f"Unknown solver: {self.solver}")

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Score unseen feature vectors: ŷ = Xw + b."""
        if self.weights is None:
            raise RuntimeError("Model must be fitted before calling predict().")
        X = np.asarray(X, dtype=np.float64)
        return (X @ self.weights.reshape(-1, 1)).ravel() + self.bias

    def score(self, X: np.ndarray, y: np.ndarray) -> float:
        """Returns R² coefficient of determination."""
        y_pred = self.predict(X)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        return float(1.0 - (ss_res / (ss_tot + 1e-12)))`,
      explanation:
        "Vectorized Python implementation leveraging NumPy BLAS/LAPACK routines. The SVD solver uses Moore-Penrose pseudo-inversion for unconditional numerical stability against rank-deficient collinear data.",
      keyDecisions: [
        "Used np.linalg.pinv instead of naive np.linalg.inv(X.T @ X) to prevent LinAlgError crashes on collinear matrices.",
        "Kept weights and bias separate in interface while unifying them internally in design matrix.",
      ],
      complexityNotes:
        "SVD Fit Time: O(n·d² + d³). GD Fit Time: O(epochs · n · d). Inference Time: O(d) sub-microsecond dot product.",
    },

    typescript: {
      filename: "LinearRegression.ts",
      code: `export class LinearRegression {
  public slope: number = 0;
  public intercept: number = 0;

  /**
   * Fits a 1D linear regression line y = wx + b using closed-form covariance equations.
   */
  public fit(x: number[], y: number[]): void {
    const n = x.length;
    if (n === 0 || n !== y.length) {
      throw new Error("Mismatched or empty sample vectors.");
    }

    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      numerator += dx * (y[i] - meanY);
      denominator += dx * dx;
    }

    if (Math.abs(denominator) < 1e-12) {
      throw new Error("Zero variance in feature X (vertical line; singular).");
    }

    this.slope = numerator / denominator;
    this.intercept = meanY - this.slope * meanX;
  }

  public predict(x: number): number {
    return this.slope * x + this.intercept;
  }

  public computeMSE(x: number[], y: number[]): number {
    let errorSum = 0;
    for (let i = 0; i < x.length; i++) {
      const diff = this.predict(x[i]) - y[i];
      errorSum += diff * diff;
    }
    return errorSum / x.length;
  }
}`,
      explanation:
        "Lightweight, zero-dependency TypeScript implementation suitable for edge runtimes, browser telemetry analytics, or web workers.",
      keyDecisions: [
        "Uses single-pass mean and two-pass covariance to minimize floating-point cancellation errors.",
        "Guards against zero-variance vertical singularities.",
      ],
      complexityNotes:
        "Fit: O(n) time, O(1) space. Predict: O(1) time (<5ns).",
    },
  },

  edgeCases: [
    {
      scenario: "Multicollinear Feature Columns (Rank Deficiency)",
      consequence:
        "Two feature columns are linearly dependent (e.g. latency_ms and latency_seconds). Matrix XᵀX has zero determinant; naive inversion throws singular matrix exception.",
      solution:
        "Use SVD pseudo-inverse (pinv), remove collinear features via Variance Inflation Factor (VIF) filtering, or add L2 Ridge regularization (XᵀX + λI) which guarantees strictly positive eigenvalues.",
    },
    {
      scenario: "Extreme Leverage Outlier",
      consequence:
        "Because MSE squares the error e², an outlier with residual 100 has 10,000x the weight of a point with residual 1, pivoting the hyperplane and ruining legitimate predictions.",
      solution:
        "Adopt Huber Loss (smooth transition from quadratic to linear penalty for |e| > δ) or replace with RANSAC / Quantile Regression.",
    },
    {
      scenario: "Zero Feature Variance",
      consequence:
        "A feature column has identical constant values across all rows. Gradient descent produces zero gradients; analytical solver divides by zero.",
      solution:
        "Implement variance threshold preprocessing to drop zero-variance features prior to model ingestion.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Silent Concept Drift & Non-Linear Saturation",
        description:
          "System operates linearly up to 80% CPU load, but enters thrashing and exponential queue growth past 80%. A linear model severely underestimates tail latency under overload.",
        mitigation:
          "Instrument continuous residual monitoring (rolling Kolmogorov-Smirnov test on residuals); alert when error distributions become skewed or autocorrelated.",
      },
      {
        title: "Numerical Overflow from Unscaled Inputs",
        description:
          "Features with vast scale differences (e.g. memory bytes: 10¹⁰ vs failure rate: 0.001) cause ill-conditioned loss surfaces where gradient descent oscillates violently or produces float64 overflow.",
        mitigation:
          "Mandate StandardScaler (Z-score normalization) in the inference and training pipeline.",
      },
    ],
    scaling10x: [
      "For massive batch datasets (100M+ rows), avoid computing (XᵀX) on single nodes; stream through MapReduce or Spark MLlib using BlockMatrix multiplication.",
      "Export fitted weights [w, b] to SIMD-accelerated C++ / Rust binaries or ONNX runtime for sub-10ns scoring directly inside API gateway proxies.",
    ],
    concurrencyRaceConditions: [
      "During online parameter updates (SGD in multi-threaded serving processes), concurrent unsynchronized weight writes lead to torn float64 reads; use atomic double buffers or write-copy-swap pointers.",
    ],
    observability: {
      metrics: [
        "model_prediction_latency_nanoseconds (gauge)",
        "model_residual_mse_rolling (gauge)",
        "model_feature_drift_kl_divergence (histogram)",
      ],
      logs: [
        "Structured JSON log when model prediction exceeds physical domain boundaries (e.g. negative latency).",
      ],
      traces: [
        "OpenTelemetry span for 'model.infer' capturing input feature vector hash and execution time.",
      ],
    },
    securityNotes: [
      "Adversarial data poisoning: A malicious tenant can craft artificial telemetry requests designed to act as high-leverage outliers, degrading autoscaling performance for all co-tenants.",
    ],
  },

  tradeoffs: [
    {
      approach: "Ordinary Least Squares (OLS)",
      advantages: "Zero hyperparameters; closed-form mathematical guarantees; fast exact solution.",
      disadvantages: "O(d³) matrix inversion scaling; hyper-sensitive to outliers.",
      useWhen: "Clean datasets with d < 1,000 features where interpretability is paramount.",
    },
    {
      approach: "Ridge Regression (L2)",
      advantages: "Guaranteed invertible; stabilizes parameters under multicollinear features.",
      disadvantages: "Requires tuning regularization strength λ.",
      useWhen: "Correlated telemetry metrics (e.g. disk read IOPS and disk write IOPS).",
    },
    {
      approach: "Lasso Regression (L1)",
      advantages: "Drives non-informative feature weights to exact zero; performs automatic feature selection.",
      disadvantages: "Non-differentiable at w=0; requires coordinate descent solver.",
      useWhen: "Sparse high-dimensional problems with thousands of noisy telemetry signals.",
    },
  ],

  furtherReading: [
    {
      title: "The Elements of Statistical Learning (Chapter 3: Linear Methods for Regression)",
      type: "Book",
      authorOrOrg: "Trevor Hastie, Robert Tibshirani, Jerome Friedman",
      description: "The definitive mathematical treatment of linear models, Gauss-Markov theorem, and shrinkage methods.",
      url: "https://hastie.su.domains/ElemStatLearn/",
    },
    {
      title: "Scikit-Learn Linear Models Architecture",
      type: "Blog",
      authorOrOrg: "Scikit-Learn Community",
      description: "In-depth engineering notes on LAPACK solver selection and conditioning.",
      url: "https://scikit-learn.org/stable/modules/linear_model.html",
    },
  ],
};
