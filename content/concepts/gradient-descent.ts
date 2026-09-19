import { Concept } from "./types";

export const gradientDescent: Concept = {
  slug: "gradient-descent",
  title: "Gradient Descent",
  shortDescription:
    "Iteratively optimize multi-dimensional non-linear objective functions by navigating the negative gradient vector across high-dimensional loss landscapes.",
  category: "Machine Learning",
  track: "Machine Learning",
  difficulty: "Beginner",
  estimatedTime: "~25 min",
  topics: [
    "First-Order Optimization",
    "Learning Rate Dynamics",
    "Stochastic Gradient Descent (SGD)",
    "Polyak Momentum",
    "Adaptive Moment Estimation (Adam)",
    "Lipschitz Smoothness & Divergence",
  ],

  overview: {
    problemStatement:
      "Most machine learning models—from multi-layer perceptrons to 500-billion parameter transformers—lack closed-form analytical solutions. Optimization requires an iterative algorithm capable of minimizing arbitrary differentiable objective functions J(θ) without computing intractable second-order Hessian tensors.",
    whenToUse: [
      "Optimizing parameters where analytical closed-form inversion is computationally infeasible or mathematically non-existent.",
      "Training large-scale deep neural networks, logistic regressors, or embedding models on streaming data.",
      "High-dimensional parameter spaces (millions to billions of weights) where first-order gradients are cheap to compute via backpropagation.",
    ],
    whenNotToUse: [
      "Small linear regression or least-squares problems where closed-form SVD Normal Equation solves in one step.",
      "Non-differentiable or discrete optimization problems (use Genetic Algorithms, Simulated Annealing, or Integer Programming).",
      "Convex quadratic objectives with known sparse structure where Conjugate Gradient or L-BFGS converges in far fewer iterations.",
    ],
    coreInvariant:
      "For any continuously differentiable function J(θ), the gradient vector ∇J(θ) points in the direction of greatest instantaneous ascent; moving in the opposite direction -∇J(θ) guarantees local decrease in loss for an infinitesimally small step size η.",
  },

  whyItExists: {
    realWorldProblem:
      "Training deep models requires updating millions of parameters simultaneously. Naive random search or finite-difference numerical gradients require evaluating the entire loss function 2·D times per step, scaling with O(D) operations where D is parameter count. Gradient descent with reverse-mode differentiation computes gradients for all D parameters in a single pass of complexity O(1) relative to forward evaluation.",
    catastrophicScenario:
      "An automated recommendation system updates user latent factors via SGD in production. An engineer sets the learning rate to 0.5 without learning rate warmup or gradient clipping. In a steep valley of the loss surface, the gradient magnitude spikes by 1,000x. The parameter update overshoots by orders of magnitude, causing weights to oscillate with exponentially expanding amplitudes until float64 overflow produces NaN (Not a Number). The NaN values propagate into the live feature store, causing 100% of user recommendation requests to fail with HTTP 500.",
    systemImpact: [
      "Oscillatory divergence and catastrophic NaN parameter corruption.",
      "Stagnation in zero-gradient saddle point plateaus causing training jobs to burn millions in GPU compute without learning.",
      "Ill-conditioned loss ravines causing zigzagging behavior and slow convergence.",
      "Catastrophic forgetting when learning rates fail to decay during fine-tuning.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Gradient descent is a first-order optimization algorithm. For a scalar objective function J(θ), the Taylor series expansion around θ_t is: J(θ_t + Δθ) ≈ J(θ_t) + ∇J(θ_t)ᵀ Δθ + (1/2) Δθᵀ ∇²J(θ_t) Δθ.",
      "To minimize J, we choose the direction Δθ that minimizes the linear term subject to bounded step length ||Δθ|| ≤ ε. By Cauchy-Schwarz inequality, this optimal direction is the normalized negative gradient: Δθ = -η ∇J(θ_t).",
      "The update rule is: θ_{t+1} = θ_t - η ∇J(θ_t), where η > 0 is the learning rate (step size).",
    ],
    singleVsDistributed:
      "In single-machine training, mini-batch gradients are accumulated in GPU SRAM. In distributed multi-GPU training (Data Parallelism), each worker computes local gradients on its micro-batch, followed by an AllReduce ring synchronization step across the InfiniBand network to sum and average gradients globally before applying parameter updates.",
    semanticsAndGuarantees: [
      "Lipschitz Upper Bound: If ∇J is L-Lipschitz continuous (||∇J(u) - ∇J(v)|| ≤ L ||u - v||), gradient descent is guaranteed to converge to a stationary point (||∇J|| → 0) whenever 0 < η < 2/L.",
      "Convexity Guarantee: For strictly convex functions, stationary points are guaranteed to be the unique global minimum.",
      "Non-Convex Reality: In deep learning, the loss surface contains billions of saddle points and local minima; modern optimizers use momentum and stochastic noise to escape saddle points.",
    ],
    keyAlgorithms: [
      {
        name: "Standard Batch Gradient Descent (BGD)",
        description:
          "Computes the exact gradient ∇J over the entire dataset of N samples before updating parameters once.",
        pros: "Smooth, monotonic descent on convex surfaces; exact gradient steps.",
        cons: "Extremely slow for large datasets; cannot fit full datasets into GPU memory.",
      },
      {
        name: "Stochastic Gradient Descent (SGD) with Momentum",
        description:
          "Maintains an exponentially decaying velocity vector v: v ← βv + (1 - β)∇J; θ ← θ - η v. Dampens oscillations in high-curvature ravines.",
        pros: "Accelerates through flat plateaus; suppresses orthogonal oscillations; generalizes exceptionally well.",
        cons: "Requires careful manual tuning of learning rate schedules and momentum coefficient β.",
      },
      {
        name: "Adaptive Moment Estimation (Adam)",
        description:
          "Maintains running estimates of both first moment (mean: m) and second raw moment (uncentered variance: v), scaling updates element-wise by 1 / (√v + ε).",
        pros: "Invariant to diagonal rescaling of gradients; robust to hyperparameter selection; industry standard for Transformers.",
        cons: "Can fail to converge on certain non-convex edge cases without weight decay (AdamW) or warmup.",
      },
    ],
  },

  visualizerType: "gradient-descent",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Evaluate Objective & Compute Gradients",
      summary: "Derive or evaluate the partial derivative vector ∇J(θ).",
      explanation:
        "Compute partial derivatives with respect to every parameter: ∇J = [∂J/∂θ₁, ∂J/∂θ₂, ..., ∂J/∂θ_d]. In practice, this is automated via reverse-mode automatic differentiation (autograd).",
      pseudocode: `grad = compute_gradient(loss_fn, params, batch_data)`,
      considerations: [
        "Check for NaN or Inf in gradient vectors before applying updates.",
      ],
    },
    {
      stepNumber: 2,
      title: "Apply Gradient Clipping",
      summary: "Bound the L2 norm of the gradient to prevent numerical explosion.",
      explanation:
        "If ||∇J|| exceeds a predefined threshold (e.g. max_norm = 1.0), rescale the gradient: ∇J ← ∇J · (max_norm / ||∇J||). This eliminates exploding gradients.",
      pseudocode: `norm = np.linalg.norm(grad)\nif norm > max_norm:\n  grad = grad * (max_norm / norm)`,
      considerations: [
        "Clip by global norm across all layers rather than per-parameter clipping to preserve gradient direction.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Optimizer State Update (Adam / Momentum)",
      summary: "Update running first and second moments with bias corrections.",
      explanation:
        "Update biased moments m_t = β₁ m_{t-1} + (1 - β₁) g_t and v_t = β₂ v_{t-1} + (1 - β₂) g_t². Apply bias correction m̂_t = m_t / (1 - β₁ᵗ) to avoid initial zero-bias.",
      pseudocode: `m = beta1 * m + (1 - beta1) * grad\nv = beta2 * v + (1 - beta2) * (grad ** 2)\nm_hat = m / (1 - beta1 ** t)\nv_hat = v / (1 - beta2 ** t)\nparams -= lr * m_hat / (np.sqrt(v_hat) + eps)`,
      considerations: [
        "Use eps = 1e-8 to avoid division by zero when gradients are zero.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Learning Rate Schedule & Warmup",
      summary: "Modulate step size η dynamically across training epochs.",
      explanation:
        "Start with linear warmup for the first 1,000 steps to stabilize initial random parameter moments, followed by Cosine Annealing decay down to 10% of peak learning rate.",
      pseudocode: `def get_lr(step, warmup_steps, total_steps, base_lr):\n  if step < warmup_steps:\n    return base_lr * (step / warmup_steps)\n  progress = (step - warmup_steps) / (total_steps - warmup_steps)\n  return 0.5 * base_lr * (1.0 + np.cos(np.pi * progress))`,
      considerations: [
        "Warmup prevents Adam's second moment v_t from locking in distorted variance estimates early in training.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "optimizers.py",
      code: `import numpy as np
from typing import Dict, List, Tuple

class SGDMomentum:
    """Stochastic Gradient Descent with Polyak Momentum."""
    def __init__(self, lr: float = 0.01, momentum: float = 0.9):
        self.lr = lr
        self.momentum = momentum
        self.velocity: Dict[int, np.ndarray] = {}

    def step(self, param_id: int, param: np.ndarray, grad: np.ndarray) -> np.ndarray:
        if param_id not in self.velocity:
            self.velocity[param_id] = np.zeros_like(param)
        v = self.velocity[param_id]
        # v = beta * v + (1 - beta) * grad
        v = self.momentum * v + grad
        self.velocity[param_id] = v
        # Update: param -= lr * v
        param -= self.lr * v
        return param

class AdamOptimizer:
    """
    Adaptive Moment Estimation (Adam) with bias corrections.
    """
    def __init__(self, lr: float = 0.001, beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m: Dict[int, np.ndarray] = {}
        self.v: Dict[int, np.ndarray] = {}
        self.t = 0

    def step(self, param_id: int, param: np.ndarray, grad: np.ndarray) -> np.ndarray:
        self.t += 1
        if param_id not in self.m:
            self.m[param_id] = np.zeros_like(param)
            self.v[param_id] = np.zeros_like(param)

        m = self.m[param_id]
        v = self.v[param_id]

        # Update biased first & second moment estimates
        m = self.beta1 * m + (1.0 - self.beta1) * grad
        v = self.beta2 * v + (1.0 - self.beta2) * (grad ** 2)
        self.m[param_id] = m
        self.v[param_id] = v

        # Compute bias-corrected moments
        m_hat = m / (1.0 - (self.beta1 ** self.t))
        v_hat = v / (1.0 - (self.beta2 ** self.t))

        # Apply parameter update
        param -= self.lr * (m_hat / (np.sqrt(v_hat) + self.eps))
        return param`,
      explanation:
        "Clean, vectorized NumPy implementations of SGD with Momentum and Adam. Demonstrates explicit moment tracking, bias-correction terms, and numerical stabilization with epsilon.",
      keyDecisions: [
        "Maintained separate state dictionaries keyed by parameter id for modularity across multi-layer networks.",
        "Applied standard bias correction factors (1 - beta^t) to eliminate initial zero-bias.",
      ],
      complexityNotes:
        "Time Complexity: O(D) per step where D is parameter count. Space Complexity: 2x parameter memory for Adam (m and v tensors).",
    },

    typescript: {
      filename: "GradientDescent.ts",
      code: `export class GradientDescent1D {
  public position: number;
  public learningRate: number;
  public stepCount: number = 0;

  constructor(initialPosition: number = 3.0, learningRate: number = 0.1) {
    this.position = initialPosition;
    this.learningRate = learningRate;
  }

  /**
   * Computes quadratic loss J(w) = 0.5 * w^2
   */
  public loss(): number {
    return 0.5 * this.position * this.position;
  }

  /**
   * Gradient dJ/dw = w
   */
  public gradient(): number {
    return this.position;
  }

  /**
   * Executes a single gradient descent step: w = w - lr * grad
   */
  public step(): { position: number; loss: number; grad: number } {
    const grad = this.gradient();
    this.position -= this.learningRate * grad;
    this.stepCount++;
    return {
      position: this.position,
      loss: this.loss(),
      grad,
    };
  }
}`,
      explanation:
        "TypeScript implementation demonstrating the mathematical recurrence relation w_{t+1} = w_t (1 - η).",
      keyDecisions: [
        "Kept analytical loss and gradient evaluation decoupled for clean visualizer bindings.",
      ],
      complexityNotes:
        "O(1) time and memory.",
    },
  },

  edgeCases: [
    {
      scenario: "Learning Rate Exceeds Lipschitz Boundary (η > 2/L)",
      consequence:
        "The step size overshoots the minimum and lands higher up the opposite slope. Error compounds exponentially (|1 - ηL| > 1), producing float64 overflow and NaN within 10 iterations.",
      solution:
        "Compute or estimate the maximum eigenvalue of the Hessian matrix, enforce learning rate warmup, and add gradient clipping.",
    },
    {
      scenario: "Vanishing Gradients in Flat Saddle Plateaus",
      consequence:
        "In zero-curvature regions (||∇J|| ≈ 0), vanilla gradient descent slows to a standstill, taking millions of steps to cross the saddle.",
      solution:
        "Use Momentum or Adam, which maintain inertia from earlier steps and scale updates by inverse variance.",
    },
    {
      scenario: "Ravine / High Condition Number Anisotropy",
      consequence:
        "The loss surface has high curvature in one direction and flat curvature in another. Vanilla GD oscillates violently back and forth across the ravine walls while making negligible forward progress.",
      solution:
        "Use adaptive learning rates (Adam) or Polyak Momentum, which dampens transverse oscillations.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "NaN Loss Explosion from Unchecked Batches",
        description:
          "A corrupted training sample with infinite values enters a training batch, generating NaN gradients. Without guard checks, all model weights turn into NaNs on the next step.",
        mitigation:
          "Implement assert torch.isfinite(loss).all() checks; discard corrupted batches and automatically rollback to the previous clean checkpoint.",
      },
      {
        title: "Learning Rate Decay Stagnation",
        description:
          "Decaying learning rates too aggressively causes model parameters to freeze prematurely in sub-optimal local basins.",
        mitigation:
          "Use Cosine Annealing with Warm Restarts (SGDR) to periodically boost learning rates and break out of poor local traps.",
      },
    ],
    scaling10x: [
      "Scale from single-GPU to 1,024 GPUs using Ring-AllReduce (NCCL) gradient accumulation, scaling effective batch size linearly while applying Linear Scaling Rule (η_effective = η_base · BatchSize / 256).",
      "Adopt Mixed Precision (FP16 / BF16) with Dynamic Loss Scaling to double training throughput while maintaining FP32 numerical stability in master parameter copies.",
    ],
    concurrencyRaceConditions: [
      "In asynchronous parameter server architectures (Hogwild!), unsynchronized gradient writes by concurrent worker threads overwrite each other; must use bounded staleness protocols.",
    ],
    observability: {
      metrics: [
        "optimizer_learning_rate (gauge)",
        "gradient_l2_norm_global (histogram)",
        "loss_step_rolling_mean (gauge)",
      ],
      logs: [
        "Alert immediately on any gradient norm spike exceeding 10x rolling median.",
      ],
      traces: [
        "OpenTelemetry span for 'optimizer.allreduce_sync' measuring network barrier synchronization latency.",
      ],
    },
    securityNotes: [
      "Gradient Inversion Attacks: In federated learning setups, eavesdroppers can mathematically reconstruct private training images by inverting the transmitted gradient vectors.",
    ],
  },

  tradeoffs: [
    {
      approach: "SGD with Momentum",
      advantages: "Superior generalization on test sets; lower memory footprint (1 state tensor per parameter).",
      disadvantages: "Hyper-sensitive to learning rate schedule; requires extensive hyperparameter search.",
      useWhen: "Computer Vision tasks (ResNets, ConvNets) where generalization is critical.",
    },
    {
      approach: "Adam / AdamW",
      advantages: "Insensitive to initial learning rate; rapid initial convergence; handles sparse features well.",
      disadvantages: "Requires 2x additional memory for m and v tensors; can overfit on noisy datasets.",
      useWhen: "Natural Language Processing (Transformers, LLMs) and Reinforcement Learning.",
    },
    {
      approach: "L-BFGS (Quasi-Newton)",
      advantages: "Leverages approximate second-order Hessian curvature; converges in extremely few iterations.",
      disadvantages: "Does not support mini-batching; requires full-dataset evaluations.",
      useWhen: "Small scientific datasets or physical simulation parameter estimation.",
    },
  ],

  furtherReading: [
    {
      title: "An Overview of Gradient Descent Optimization Algorithms",
      type: "Paper",
      authorOrOrg: "Sebastian Ruder",
      description: "The seminal survey comparing SGD, Momentum, Nesterov, AdaGrad, RMSprop, and Adam.",
      url: "https://arxiv.org/abs/1609.04747",
    },
    {
      title: "Adam: A Method for Stochastic Optimization",
      type: "Paper",
      authorOrOrg: "Diederik P. Kingma, Jimmy Ba (ICLR 2015)",
      description: "The foundational publication introducing the Adam optimizer.",
      url: "https://arxiv.org/abs/1412.6980",
    },
  ],
};
