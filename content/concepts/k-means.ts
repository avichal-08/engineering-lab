import { Concept } from "./types";

export const kMeans: Concept = {
  slug: "k-means",
  title: "K-Means Clustering",
  shortDescription:
    "Partition unlabeled multidimensional observations into K cohesive clusters via iterative Expectation-Maximization and Voronoi tessellation.",
  category: "Machine Learning",
  track: "Machine Learning",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Lloyd's Algorithm",
    "Expectation-Maximization (EM)",
    "Within-Cluster Sum of Squares (Inertia)",
    "K-Means++ Initialization",
    "Voronoi Partitions",
    "Elbow Method & Silhouette Analysis",
  ],

  overview: {
    problemStatement:
      "Most real-world engineering telemetry lacks ground-truth supervised labels. Unsupervised clustering groups unlabeled observations into cohesive clusters to discover hidden patterns, segment user behaviors, compress high-dimensional vector embeddings, and detect anomalous server workloads.",
    whenToUse: [
      "Customer or tenant behavioral segmentation across multi-dimensional usage metrics.",
      "Vector quantization in vector databases (e.g. Inverted File Index IVF-PQ in Milvus / Faiss).",
      "Anomaly detection: flag telemetry points with high Euclidean distance from all cluster centroids.",
      "Image color quantization and feature pre-clustering for semi-supervised pipelines.",
    ],
    whenNotToUse: [
      "Non-spherical or manifold cluster shapes (e.g. concentric rings, spirals; use DBSCAN or Spectral Clustering).",
      "Datasets with clusters of radically varying densities or unequal sizes (use Gaussian Mixture Models).",
      "High-dimensional text embeddings where cosine similarity is required and Euclidean distances degenerate.",
      "When the number of clusters K is fundamentally unknown and cannot be estimated.",
    ],
    coreInvariant:
      "K-Means strictly minimizes the Within-Cluster Sum of Squares (WCSS / Inertia): J = ∑ₖ ∑_{x ∈ Cₖ} ||x - μₖ||². The algorithm is mathematically guaranteed to decrease or maintain J at every step and converge to a local minimum in a finite number of iterations.",
  },

  whyItExists: {
    realWorldProblem:
      "Vector search databases storing millions of 768-dimensional text embeddings cannot perform brute-force cosine distance scans against every vector on every query. K-Means clusters the vector space into K = 4,096 Voronoi cells. At query time, the system only scans vectors inside the top 8 closest centroid cells, reducing query search latency from 120ms to 1.8ms.",
    catastrophicScenario:
      "A security team deploys K-Means with random initialization to cluster network connection profiles and detect zero-day intrusions. Because standard random initialization traps centroids in sub-optimal local minima, two distant attacker command-and-control botnet nodes are lumped into the massive normal web traffic cluster. The intrusion goes undetected for 4 months because K-Means split a dense legitimate cluster in half instead of isolating the sparse malicious cluster.",
    systemImpact: [
      "Centroid trapping in poor local minima due to naive random initialization.",
      "Arbitrary linear Voronoi slicing of complex non-linear natural data manifolds.",
      "Outlier sensitivity: single distant anomalous nodes pull centroids far from true dense centers.",
      "The Curse of Dimensionality: in >100 dimensions, all pairwise Euclidean distances become nearly identical.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "K-Means (Lloyd's algorithm) solves an NP-hard combinatorial optimization problem using a two-phase Expectation-Maximization (EM) heuristic.",
      "Phase 1 (Assignment / Expectation): Each data point xᵢ is assigned to its nearest centroid μₖ based on Euclidean distance: cᵢ = argmin_k ||xᵢ - μₖ||².",
      "Phase 2 (Update / Maximization): Each centroid μₖ is recomputed as the arithmetic mean of all points assigned to it: μₖ = (1 / |Cₖ|) ∑_{x ∈ Cₖ} x.",
      "These two phases alternate iteratively until point assignments stop changing (convergence) or centroid shifts fall below a tolerance threshold ε.",
    ],
    singleVsDistributed:
      "Single-node K-Means processes millions of 2D to 64D points using vectorized SIMD loops or GPU CUDA kernels. For petabyte-scale distributed datasets, Mini-Batch K-Means or Spark MLlib distributes assignment across worker partitions and aggregates centroid coordinate sums and counts via MapReduce tree reduction.",
    semanticsAndGuarantees: [
      "Monotonic Convergence Guarantee: Because both the assignment step and update step independently minimize the exact same objective function J, Inertia monotonically decreases: J_{t+1} ≤ J_t. Convergence is guaranteed.",
      "Local vs Global Optimum: K-Means does not guarantee finding the global optimum; it converges to a local stationary point dependent on initial centroid placement.",
      "Voronoi Geometry: The decision boundaries partitioning clusters are convex polygons formed by the perpendicular bisectors between centroid pairs.",
    ],
    keyAlgorithms: [
      {
        name: "Standard Lloyd's Algorithm",
        description:
          "Alternates full-dataset assignment and centroid coordinate re-averaging until convergence.",
        pros: "Simple to implement; exact monotonic convergence.",
        cons: "O(N · K · d · iterations) complexity; sensitive to initialization.",
      },
      {
        name: "K-Means++ Initialization",
        description:
          "Selects the first centroid randomly, then chooses subsequent centroids with probability proportional to their squared distance D(x)² from the closest already chosen centroid.",
        pros: "Mathematically proven O(log K) competitive bound to the optimal clustering; prevents clustered initializations.",
        cons: "Slight initial sequential computational overhead before main loop.",
      },
      {
        name: "Mini-Batch K-Means",
        description:
          "Updates centroids incrementally using small randomized batches (e.g. 512 samples) with an exponential decay learning rate.",
        pros: "Reduces computation time by 10x-100x; processes streaming datasets larger than RAM.",
        cons: "Produces slightly higher final inertia than standard Lloyd's algorithm.",
      },
    ],
  },

  visualizerType: "k-means",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Initialize Centroids using K-Means++",
      summary: "Spread initial cluster centers apart in feature space.",
      explanation:
        "Pick first centroid μ₁ uniformly at random from data points. For k = 2..K, compute D(x) = min_{j<k} ||x - μ_j||². Sample the next centroid with probability p(x) = D(x)² / ∑ D(x)². This spreads initial seeds across distinct clusters.",
      pseudocode: `centroids = [random_choice(X)]\nfor _ in range(1, K):\n  dists = np.min([cdist(X, [c])**2 for c in centroids], axis=0)\n  probs = dists / np.sum(dists)\n  centroids.append(X[np.random.choice(len(X), p=probs)])`,
      considerations: [
        "Avoid pure random uniform initialization in bounding boxes as it often generates empty clusters.",
      ],
    },
    {
      stepNumber: 2,
      title: "Assignment Phase: Compute Pairwise Distances",
      summary: "Assign every point to its closest centroid.",
      explanation:
        "Compute the N×K squared Euclidean distance matrix using the binomial expansion ||x - μ||² = ||x||² - 2xᵀμ + ||μ||² for high-performance matrix multiplication.",
      pseudocode: `def assign_clusters(X, centroids):\n  # dists: [N, K]\n  dists = np.linalg.norm(X[:, np.newaxis] - centroids, axis=2)\n  return np.argmin(dists, axis=1)`,
      considerations: [
        "Vectorize distance computations to leverage BLAS level-3 matrix operations.",
      ],
    },
    {
      stepNumber: 3,
      title: "Update Phase: Recompute Centroids",
      summary: "Move centroids to the mean coordinate of their assigned points.",
      explanation:
        "For each cluster k, calculate the coordinate average. If a cluster becomes empty (zero points assigned), reinitialize its centroid to the point furthest from all other centroids.",
      pseudocode: `for k in range(K):\n  pts = X[labels == k]\n  if len(pts) > 0:\n    new_centroids[k] = np.mean(pts, axis=0)\n  else:\n    new_centroids[k] = X[np.argmax(min_dists)]`,
      considerations: [
        "Check for empty cluster edge cases to avoid NaN coordinate updates.",
      ],
    },
    {
      stepNumber: 4,
      title: "Convergence Check & Inertia Telemetry",
      summary: "Halt when centroid shift is smaller than tolerance ε.",
      explanation:
        "Calculate max centroid displacement ||μ_new - μ_old||. If displacement < tolerance (e.g. 1e-4), declare convergence and return labels and inertia.",
      considerations: [
        "Cap maximum iterations (e.g. max_iter = 300) to guarantee loop termination.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "kmeans.py",
      code: `import numpy as np
from typing import Tuple

class KMeans:
    """
    Vectorized K-Means clustering with K-Means++ initialization.
    """
    def __init__(self, k: int = 3, max_iter: int = 100, tol: float = 1e-4):
        self.k = k
        self.max_iter = max_iter
        self.tol = tol
        self.centroids: np.ndarray = None
        self.inertia_: float = 0.0

    def _init_kmeans_plus_plus(self, X: np.ndarray) -> np.ndarray:
        n_samples = X.shape[0]
        centroids = [X[np.random.randint(n_samples)]]

        for _ in range(1, self.k):
            # Compute distance from each point to nearest existing centroid
            dists_sq = np.min(
                np.array([np.sum((X - c) ** 2, axis=1) for c in centroids]), axis=0
            )
            probs = dists_sq / np.sum(dists_sq)
            next_idx = np.random.choice(n_samples, p=probs)
            centroids.append(X[next_idx])

        return np.array(centroids)

    def fit(self, X: np.ndarray) -> "KMeans":
        X = np.asarray(X, dtype=np.float64)
        n_samples, n_features = X.shape

        self.centroids = self._init_kmeans_plus_plus(X)

        for _ in range(self.max_iter):
            # Phase 1: Assignment
            # dists shape: [n_samples, k]
            dists = np.linalg.norm(X[:, np.newaxis, :] - self.centroids[np.newaxis, :, :], axis=2)
            labels = np.argmin(dists, axis=1)

            # Phase 2: Update Centroids
            new_centroids = np.zeros_like(self.centroids)
            for j in range(self.k):
                assigned = X[labels == j]
                if len(assigned) > 0:
                    new_centroids[j] = np.mean(assigned, axis=0)
                else:
                    # Handle empty cluster: reseed to random point
                    new_centroids[j] = X[np.random.randint(n_samples)]

            # Check convergence
            shift = np.max(np.linalg.norm(new_centroids - self.centroids, axis=1))
            self.centroids = new_centroids
            if shift < self.tol:
                break

        # Calculate final Inertia (WCSS)
        final_dists_sq = np.min(
            np.array([np.sum((X - c) ** 2, axis=1) for c in self.centroids]), axis=0
        )
        self.inertia_ = float(np.sum(final_dists_sq))
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        X = np.asarray(X, dtype=np.float64)
        dists = np.linalg.norm(X[:, np.newaxis, :] - self.centroids[np.newaxis, :, :], axis=2)
        return np.argmin(dists, axis=1)`,
      explanation:
        "Vectorized Python implementation implementing the full Lloyd's algorithm with K-Means++ seeding. Features graceful empty-cluster handling and Euclidean broadcasting.",
      keyDecisions: [
        "Implemented K-Means++ seeding rather than naive random picking to prevent sub-optimal traps.",
        "Broadcasting via X[:, np.newaxis, :] avoids Python nested loops for distance calculation.",
      ],
      complexityNotes:
        "Time Complexity: O(iterations · N · K · d). Space Complexity: O(N · K) for distance matrix.",
    },

    typescript: {
      filename: "KMeans.ts",
      code: `export class KMeans2D {
  public centroids: [number, number][] = [];

  constructor(private readonly k: number = 3, private readonly maxIter: number = 50) {}

  public fit(points: [number, number][]): number[] {
    const n = points.length;
    if (n < this.k) throw new Error("Dataset size smaller than K.");

    // Simple random initialization from points
    this.centroids = [];
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.k; i++) {
      this.centroids.push([...shuffled[i]]);
    }

    let labels: number[] = new Array(n).fill(-1);

    for (let iter = 0; iter < this.maxIter; iter++) {
      let reassignments = 0;

      // Phase 1: Assign
      for (let i = 0; i < n; i++) {
        let minDistSq = Infinity;
        let closest = 0;
        for (let c = 0; c < this.k; c++) {
          const dx = points[i][0] - this.centroids[c][0];
          const dy = points[i][1] - this.centroids[c][1];
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closest = c;
          }
        }
        if (labels[i] !== closest) {
          labels[i] = closest;
          reassignments++;
        }
      }

      if (reassignments === 0) break; // Converged

      // Phase 2: Update
      for (let c = 0; c < this.k; c++) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let i = 0; i < n; i++) {
          if (labels[i] === c) {
            sumX += points[i][0];
            sumY += points[i][1];
            count++;
          }
        }
        if (count > 0) {
          this.centroids[c] = [sumX / count, sumY / count];
        }
      }
    }

    return labels;
  }
}`,
      explanation:
        "Clean TypeScript 2D implementation powering client-side clustering simulations without external dependencies.",
      keyDecisions: [
        "Tracks reassignments count to break early on exact convergence.",
        "Guards against division by zero in centroid coordinate recalculation.",
      ],
      complexityNotes:
        "O(iterations · N · K) time, O(N) space.",
    },
  },

  edgeCases: [
    {
      scenario: "Non-Convex / Manifold Topologies (Concentric Rings)",
      consequence:
        "K-Means partitions space using straight linear Voronoi boundaries. It cannot learn concentric circles or interlocking spirals, slicing through both rings arbitrarily.",
      solution:
        "Project features into higher dimensions via Kernel PCA, or switch to density-based clustering (DBSCAN / HDBSCAN).",
    },
    {
      scenario: "Extreme Outliers (Isolated Far Points)",
      consequence:
        "Because WCSS uses squared Euclidean distances, a single extreme outlier exerts tremendous pull on a centroid, dragging it away from true dense data clusters.",
      solution:
        "Use K-Medoids (PAM), which restricts cluster centers to actual median data points and minimizes L1 Manhattan distance.",
    },
    {
      scenario: "Unequal Cluster Sizes and Densities",
      consequence:
        "K-Means tends to produce clusters of equal spatial diameter. If one cluster is massive and another is tiny, K-Means splits the massive cluster and absorbs the tiny one.",
      solution:
        "Switch to Gaussian Mixture Models (GMM) with covariance matrix modeling.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Sub-Optimal Local Minimum Trap",
        description:
          "With poor initialization, centroids get stuck in sub-optimal configurations with high Inertia, misclassifying critical user segments.",
        mitigation:
          "Run K-Means multiple times (n_init = 10) with K-Means++ and choose the model with minimum final Inertia.",
      },
      {
        title: "Wrong Selection of K (Over/Under-Segmentation)",
        description:
          "Arbitrarily choosing K=5 when true underlying latent groups number K=2 leads to artificial segmentation and noisy downstream business actions.",
        mitigation:
          "Compute Elbow curve (WCSS vs K) and Silhouette Score across candidate values of K ∈ [2, 10] before finalizing model parameters.",
      },
    ],
    scaling10x: [
      "In vector search engines (IVF-PQ indexing), train centroids using Mini-Batch K-Means on a representative 100,000 vector sample, then assign full billion-vector datasets in parallel.",
      "Use triangular inequality acceleration (Elkan's Algorithm) to avoid unnecessary distance calculations when lower bounds prove a point cannot belong to a competing centroid.",
    ],
    concurrencyRaceConditions: [
      "When updating cluster centroids online with streaming data, concurrent thread increments on centroid sum tensors cause race condition corruption; use thread-local accumulators combined at epoch barriers.",
    ],
    observability: {
      metrics: [
        "kmeans_inertia_value (gauge)",
        "kmeans_iterations_to_convergence (gauge)",
        "kmeans_cluster_size_distribution{cluster_id} (gauge)",
      ],
      logs: [
        "Log warning if any cluster contains < 0.5% of total dataset points (near-empty cluster anomaly).",
      ],
      traces: [
        "OpenTelemetry span for 'kmeans.fit' and 'kmeans.predict'.",
      ],
    },
    securityNotes: [
      "Cluster poisoning: An attacker injects synthetic coordinated coordinates into a feedback loop to shift cluster centroids, manipulating downstream fraud or recommendation categorization.",
    ],
  },

  tradeoffs: [
    {
      approach: "K-Means (Lloyd's)",
      advantages: "Simple; fast O(N); predictable memory footprint; scales to huge datasets.",
      disadvantages: "Requires specifying K; assumes spherical clusters; sensitive to outliers.",
      useWhen: "Large-scale vector quantization and customer segmentation with isotropic features.",
    },
    {
      approach: "DBSCAN (Density-Based)",
      advantages: "Discovers arbitrary non-linear shapes; does not require K; automatically isolates noise/outliers.",
      disadvantages: "Fails with variable density clusters; scales O(N²) without spatial indexing.",
      useWhen: "Geospatial telemetry, anomaly detection, and non-convex cluster topologies.",
    },
    {
      approach: "Hierarchical Agglomerative Clustering",
      advantages: "Builds a rich multi-scale dendrogram hierarchy; no initial K required.",
      disadvantages: "O(N³) time and O(N²) memory complexity; impossible to scale beyond 20,000 samples.",
      useWhen: "Taxonomy generation, phylogenetic analysis, and small-scale biological datasets.",
    },
  ],

  furtherReading: [
    {
      title: "k-means++: The Advantages of Careful Seeding",
      type: "Paper",
      authorOrOrg: "David Arthur, Sergei Vassilvitskii (SODA 2007)",
      description: "The seminal Stanford paper proving the O(log k) approximation guarantee of K-Means++.",
      url: "https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf",
    },
    {
      title: "Billion-Scale Similarity Search with GPUs (Faiss)",
      type: "Paper",
      authorOrOrg: "Jeff Johnson, Matthijs Douze, Hervé Jégou (Meta AI)",
      description: "How high-performance K-Means vector quantization enables sub-millisecond similarity search across billions of vectors.",
      url: "https://arxiv.org/abs/1702.08734",
    },
  ],
};
