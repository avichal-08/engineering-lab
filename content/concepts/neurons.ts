import { Concept } from "./types";

export const neurons: Concept = {
  slug: "neurons",
  title: "Neurons & Forward Propagation",
  shortDescription:
    "Compose linear affine transformations with non-linear activation functions to compute hierarchical feature representations across deep networks.",
  category: "Deep Learning",
  track: "Deep Learning",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "Artificial Neuron Model",
    "Affine Transformation (z = wᵀx + b)",
    "Non-Linear Activation Mapping",
    "Vectorized Layer Forward Pass (A = σ(XW + b))",
    "Computation Graphs & State Caching",
    "Dead Neurons & Saturation",
  ],

  overview: {
    problemStatement:
      "A single linear transformation cannot solve even the simple non-linear XOR function (Minsky & Papert, 1969). Deep learning solves complex perceptual problems by chaining layers of computational units—artificial neurons—each performing a parameterized affine projection followed by an element-wise non-linear activation, transforming raw inputs into progressively more abstract manifolds.",
    whenToUse: [
      "Perceptual learning tasks: computer vision, speech recognition, and natural language understanding.",
      "Learning complex non-linear decision surfaces that cannot be hand-engineered through polynomial expansion.",
      "Representation learning: generating dense semantic embeddings from unstructured raw inputs.",
    ],
    whenNotToUse: [
      "Small tabular datasets (< 10,000 rows) where Gradient Boosted Trees (XGBoost) reliably outperform neural networks with far less tuning.",
      "Strict linear relationships where Ordinary Least Squares provides exact, un-regularized physical coefficients.",
      "Environments with severe memory or battery constraints where floating-point tensor operations cannot be afforded.",
    ],
    coreInvariant:
      "A neural layer transforms input tensor X ∈ ℝ^{B × d_in} into activation tensor A ∈ ℝ^{B × d_out} via A = f(X W + b), where W ∈ ℝ^{d_in × d_out} is the weight tensor, b ∈ ℝ^{1 × d_out} is the broadcast bias vector, and f is an element-wise non-linear function.",
  },

  whyItExists: {
    realWorldProblem:
      "In speech recognition, raw audio wave sound pressure levels vary dramatically based on speaker accent, pitch, and microphone distance. A single linear model cannot separate phonemes. By passing audio through stacked neural layers, early layers detect spectral formant edges, middle layers combine formants into phonetic units, and deep layers output words invariant to speaker pitch.",
    catastrophicScenario:
      "A robotics company deploys an autonomous driving obstacle detector. An engineer initializes the final classification layer with large positive biases (b = 10.0) and ReLU activations. In extreme operating temperatures, several sensor inputs drift negative. Because the large negative inputs push the pre-activation sum z far below zero (z = -8.5), the ReLU output becomes permanently 0.0, and its gradient drops to 0.0. The obstacle neuron dies permanently; the vehicle fails to brake and collides with an obstacle during testing.",
    systemImpact: [
      "Dead ReLU neurons: permanent zero activations and zero backpropagated gradients.",
      "Neuron saturation: large pre-activations push Sigmoid/Tanh into zero-gradient flat zones.",
      "Unbounded activation explosion: unnormalized layers cause activations to compound to infinity.",
      "Matrix dimension mismatches in dense layers halting training pipelines.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "The biological neuron inspired the mathematical McCulloch-Pitts / Rosenblatt perceptron model. An artificial neuron receives input vector x = [x₁, x₂, ..., x_d]ᵀ.",
      "Step 1 (Affine Transformation): The neuron computes the inner dot product with weight vector w and adds a scalar bias b: z = ∑ wᵢ xᵢ + b = wᵀx + b. Geometrically, w determines the orientation of a hyperplane in feature space, and b determines its translation from the origin.",
      "Step 2 (Non-Linear Activation): The scalar pre-activation z is passed through an activation function a = f(z) (e.g. ReLU, GELU, Sigmoid). Without f(z), a 100-layer network would mathematically collapse to a single linear regression model.",
      "Vectorized Layer Forward Pass: In a full layer with N neurons processing a batch of B samples, the computation vectorizes into a single BLAS GEMM (General Matrix Multiply): Z = X W + b, followed by element-wise A = f(Z).",
    ],
    singleVsDistributed:
      "On single GPUs, forward propagation is executed via highly optimized CUDA tensor cores (cuBLAS / CUTLASS). In large language models exceeding single GPU VRAM, Tensor Parallelism (Megatron-LM) splits weight matrix W column-wise across GPUs: each GPU computes Z_partial = X W_slice, followed by an All-Gather communication collective.",
    semanticsAndGuarantees: [
      "Universal Approximation Theorem (Cybenko, 1989; Hornik, 1991): A single hidden layer feedforward network with non-linear activation functions can approximate any continuous function on compact subsets of ℝⁿ to arbitrary precision, given sufficient neurons.",
      "Computation Graph Caching: During the forward pass, intermediate tensors X, W, and Z must be stored in GPU VRAM because they are required by the backward pass to compute gradients ∂L/∂W and ∂L/∂X.",
    ],
    keyAlgorithms: [
      {
        name: "Vectorized Dense (Fully Connected) Layer",
        description:
          "Computes A = σ(XW + b) using BLAS level-3 matrix multiplication.",
        pros: "Fully connects all input features; maximum expressive representation capacity.",
        cons: "O(d_in · d_out) parameter memory; lacks spatial or temporal inductive bias.",
      },
      {
        name: "Layer Normalization / Batch Normalization",
        description:
          "Normalizes the pre-activation distribution across feature dimensions to have mean 0 and variance 1, preventing internal covariate shift.",
        pros: "Stabilizes deep layer forward activations; enables higher learning rates.",
        cons: "Adds compute overhead and synchronization barriers in distributed setups.",
      },
    ],
  },

  visualizerType: "neurons",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Initialize Weight Tensors (He / Xavier Normal)",
      summary: "Sample weights from variance-calibrated distributions.",
      explanation:
        "Never initialize weights to zeros (causes symmetry collapse) or large random numbers (causes saturation). For ReLU activations, use He (Kaiming) initialization: W ~ Normal(0, sqrt(2 / d_in)). For Sigmoid/Tanh, use Xavier (Glorot): W ~ Normal(0, sqrt(2 / (d_in + d_out))).",
      pseudocode: `std = np.sqrt(2.0 / d_in)\nW = np.random.randn(d_in, d_out) * std\nb = np.zeros((1, d_out))`,
      considerations: [
        "Biases are conventionally initialized to zero.",
      ],
    },
    {
      stepNumber: 2,
      title: "Compute Affine Projection (Matrix Multiplication)",
      summary: "Perform General Matrix Multiply (GEMM) Z = XW + b.",
      explanation:
        "Multiply the batch input matrix X (shape [B, d_in]) with weight matrix W (shape [d_in, d_out]) and add bias b (shape [1, d_out], broadcast across B rows).",
      pseudocode: `Z = np.dot(X, W) + b`,
      considerations: [
        "In production C++/CUDA, ensure matrices are contiguous in memory to maximize hardware cache hits.",
      ],
    },
    {
      stepNumber: 3,
      title: "Apply Element-Wise Activation Function",
      summary: "Pass pre-activations Z through non-linear function f(Z).",
      explanation:
        "Apply element-wise activation: for ReLU, A = max(0, Z); for GELU, A = Z · Φ(Z).",
      pseudocode: `A = np.maximum(0, Z)  # ReLU`,
      considerations: [
        "In-place activations save memory but overwrite pre-activations needed for backpropagation.",
      ],
    },
    {
      stepNumber: 4,
      title: "Cache State for Backward Pass",
      summary: "Preserve inputs X and pre-activations Z in memory for the backward pass.",
      explanation:
        "The Chain Rule requires X to calculate ∂L/∂W = Xᵀ · δ, and requires Z to calculate activation derivatives f'(Z). Store these in a cache tuple.",
      pseudocode: `cache = (X, W, Z)`,
      considerations: [
        "Activation checkpointing recomputes A during backward pass to trade 30% more compute for 70% less VRAM.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "dense_layer.py",
      code: `import numpy as np
from typing import Tuple, Dict

class DenseLayer:
    """
    Production-grade Fully Connected Neural Network Layer.
    Implements vectorized forward propagation with state caching.
    """
    def __init__(self, input_dim: int, output_dim: int, activation: str = "relu"):
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.activation_name = activation.lower()

        # He (Kaiming) Normal initialization for ReLU
        limit = np.sqrt(2.0 / input_dim)
        self.W = np.random.randn(input_dim, output_dim) * limit
        self.b = np.zeros((1, output_dim))

        # Backward cache
        self.cache: Dict[str, np.ndarray] = {}

    def _activate(self, Z: np.ndarray) -> np.ndarray:
        if self.activation_name == "relu":
            return np.maximum(0.0, Z)
        elif self.activation_name == "sigmoid":
            Z_clipped = np.clip(Z, -15.0, 15.0)
            return 1.0 / (1.0 + np.exp(-Z_clipped))
        elif self.activation_name == "linear":
            return Z
        else:
            raise ValueError(f"Unsupported activation: {self.activation_name}")

    def forward(self, X: np.ndarray) -> np.ndarray:
        """
        Execute forward propagation for a batch of inputs.
        X shape: [batch_size, input_dim]
        Returns: A shape [batch_size, output_dim]
        """
        X = np.asarray(X, dtype=np.float32)
        # Affine projection: Z = XW + b
        Z = np.dot(X, self.W) + self.b
        # Non-linear activation
        A = self._activate(Z)

        # Cache tensors required for backward pass
        self.cache = {"X": X, "Z": Z, "A": A}
        return A

    def get_dead_neuron_ratio(self) -> float:
        """Calculates proportion of neurons with 0.0 activation across the batch."""
        if "A" not in self.cache or self.activation_name != "relu":
            return 0.0
        A = self.cache["A"]
        # A neuron is dead if it outputs 0.0 across all samples in the batch
        dead_mask = np.all(A == 0.0, axis=0)
        return float(np.mean(dead_mask))`,
      explanation:
        "High-performance vectorized Python neural layer using NumPy GEMM routines. Implements He initialization, activation caching, and runtime dead neuron telemetry.",
      keyDecisions: [
        "Used float32 data types matching standard GPU deep learning precisions.",
        "Included dead neuron ratio detection to diagnose vanishing ReLU activations.",
      ],
      complexityNotes:
        "Forward Time: O(B · d_in · d_out) matrix multiplication. Memory: O(B · (d_in + d_out)) for forward cache.",
    },

    typescript: {
      filename: "Neuron.ts",
      code: `export class SingleNeuron {
  constructor(
    public weights: number[],
    public bias: number,
    public activation: "relu" | "sigmoid" = "relu"
  ) {}

  public forward(inputs: number[]): { z: number; a: number; partials: number[] } {
    if (inputs.length !== this.weights.length) {
      throw new Error("Input dimension mismatch.");
    }

    const partials = inputs.map((x, i) => x * this.weights[i]);
    const z = partials.reduce((acc, val) => acc + val, 0) + this.bias;

    let a = 0;
    if (this.activation === "relu") {
      a = Math.max(0, z);
    } else if (this.activation === "sigmoid") {
      a = 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
    }

    return { z, a, partials };
  }
}`,
      explanation:
        "TypeScript neuron implementation exposing inspectable partial products and pre-activation values for real-time visualization.",
      keyDecisions: [
        "Returns individual partial products (x_i * w_i) to illuminate the internal summation mechanism.",
      ],
      complexityNotes:
        "O(d) time, O(d) space.",
    },
  },

  edgeCases: [
    {
      scenario: "Dying ReLU Epidemic",
      consequence:
        "If a large gradient update pushes weights negative, pre-activation z remains negative for all training inputs. The neuron outputs 0 and transmits 0 gradient forever.",
      solution:
        "Replace standard ReLU with LeakyReLU (f(z) = max(0.01z, z)) or GELU, and lower the learning rate.",
    },
    {
      scenario: "Zero Weight Initialization (Symmetry Defect)",
      consequence:
        "If all weights start at 0.0, every neuron in the hidden layer receives identical inputs, computes identical activations, and receives identical gradients. Neurons never diverge to learn distinct features.",
      solution:
        "Always use random symmetry-breaking initialization (He Normal or Xavier Uniform).",
    },
    {
      scenario: "Extreme Pre-Activation Magnitude (Exp Overflow)",
      consequence:
        "In Sigmoid or Softmax, if z > 709, Math.exp(z) produces Infinity; if z < -709, it underflows to 0, producing NaN downstream.",
      solution:
        "Apply log-sum-exp trick and clamp z values to [-15, 15] before exponentiation.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Silent NaN Propagation",
        description:
          "A single NaN in one neuron propagates through matrix multiplication to turn every subsequent activation and weight tensor in the network into NaN.",
        mitigation:
          "Add torch.isnan().any() assertion hooks during training; enable PyTorch anomaly detection (torch.autograd.set_detect_anomaly(True)).",
      },
      {
        title: "GPU Memory OOM from Large Hidden Dimensions",
        description:
          "Sizing hidden layer to 8,192 with batch size 128 consumes gigabytes of forward cache memory, causing GPU Out-Of-Memory CUDA errors.",
        mitigation:
          "Employ Gradient Checkpointing, reduce micro-batch size, or shard activations across tensor-parallel ranks.",
      },
    ],
    scaling10x: [
      "Fuse affine projection and activation into a single CUDA kernel (e.g. FlashAttention / cuDNN fused GEMM+ReLU) to eliminate VRAM round-trips.",
      "Quantize weights and activations from FP32 to INT8 / FP8 for inference, quadrupling throughput on modern Tensor Cores.",
    ],
    concurrencyRaceConditions: [
      "In multi-GPU DataParallel setups, parameter broadcasts must complete before forward propagation begins; asynchronous execution requires CUDA stream synchronization events.",
    ],
    observability: {
      metrics: [
        "neuron_layer_dead_ratio (gauge)",
        "layer_activation_mean (gauge)",
        "layer_activation_std (gauge)",
      ],
      logs: [
        "Log warning if dead neuron ratio in any layer exceeds 20%.",
      ],
      traces: [
        "OpenTelemetry span for 'layer.forward_gemm' tracking tensor execution time.",
      ],
    },
    securityNotes: [
      "Model Inversion Attacks: An adversary observing output activations can solve for sensitive input training records via constrained gradient optimization.",
    ],
  },

  tradeoffs: [
    {
      approach: "Wide Hidden Layers (High d_out)",
      advantages: "High capacity to learn memorized feature interactions in a single step; easily parallelizable.",
      disadvantages: "O(d²) memory explosion; prone to severe overfitting without dropout.",
      useWhen: "Embedding expansion layers in Transformer feed-forward networks (e.g. 4x hidden dim).",
    },
    {
      approach: "Deep Hidden Layers (Many Sequential Layers)",
      advantages: "Exponentially higher representational efficiency than wide shallow networks for the same parameter budget.",
      disadvantages: "Prone to vanishing/exploding gradients; requires residual connections (ResNet skip connections).",
      useWhen: "Complex hierarchical domains: image recognition, LLMs, speech synthesis.",
    },
    {
      approach: "Linear Layers without Non-Linearity",
      advantages: "Mathematically simple; zero vanishing gradients.",
      disadvantages: "Collapses to single linear model: W_3 · W_2 · W_1 · x = W_eff · x. Zero non-linear capacity.",
      useWhen: "Dimensionality reduction (similar to PCA) or low-rank bottleneck projections.",
    },
  ],

  furtherReading: [
    {
      title: "Deep Learning (Chapter 6: Deep Feedforward Networks)",
      type: "Book",
      authorOrOrg: "Ian Goodfellow, Yoshua Bengio, Aaron Courville (MIT Press)",
      description: "The authoritative textbook chapter on neural network forward architecture and universal approximation.",
      url: "https://www.deeplearningbook.org/contents/mlp.html",
    },
    {
      title: "Delving Deep into Rectifiers (He Initialization)",
      type: "Paper",
      authorOrOrg: "Kaiming He et al. (ICCV 2015)",
      description: "The foundational paper establishing correct weight variance scaling for deep networks.",
      url: "https://arxiv.org/abs/1502.01852",
    },
  ],
};
