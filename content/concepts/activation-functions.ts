import { Concept } from "./types";

export const activationFunctions: Concept = {
  slug: "activation-functions",
  title: "Activation Functions",
  shortDescription:
    "Inject non-linearity into deep neural computation graphs to prevent mathematical collapse and govern gradient flow during backpropagation.",
  category: "Deep Learning",
  track: "Deep Learning",
  difficulty: "Intermediate",
  estimatedTime: "~20 min",
  topics: [
    "Non-Linearity & Mathematical Collapse",
    "Vanishing & Exploding Gradients",
    "Rectified Linear Unit (ReLU)",
    "Leaky ReLU & Parametric ReLU",
    "Gaussian Error Linear Unit (GELU)",
    "Sigmoid & Hyperbolic Tangent (Tanh)",
  ],

  overview: {
    problemStatement:
      "If every layer in a deep network only performed linear transformations (z = Wx + b), a 100-layer network would mathematically collapse to a single linear layer: ŷ = W₁₀₀(W₉₉...W₁x) = W_eff x. Activation functions provide the critical non-linear activation gating required to approximate complex non-linear manifolds.",
    whenToUse: [
      "Hidden layers of all deep neural architectures: MLP, CNNs, RNNs, and Transformers.",
      "GELU / SwiGLU: modern state-of-the-art Large Language Models (LLaMA, GPT-4, Claude).",
      "ReLU / LeakyReLU: computationally constrained edge inference and computer vision backbones.",
      "Sigmoid / Softmax: final output layers for binary and multi-class probability calibration.",
    ],
    whenNotToUse: [
      "Sigmoid or Tanh in deep hidden layers (causes fatal vanishing gradients past 3-4 layers).",
      "Unbounded activations (e.g. standard linear) in recurrent feedback loops (causes numerical explosion).",
      "Non-differentiable step functions (Heaviside step function: derivative is 0 everywhere, halting gradient descent).",
    ],
    coreInvariant:
      "An activation function f(z) must be non-linear and differentiable almost everywhere; its derivative f'(z) directly scales the backpropagated error signal δ = ∂L/∂a · f'(z), governing whether gradients survive or vanish across network depth.",
  },

  whyItExists: {
    realWorldProblem:
      "In early deep networks (1990s-2000s), researchers used Sigmoid activations. Because Sigmoid's derivative maxes out at 0.25 and drops to <0.01 when saturated, backpropagation across 5 layers multiplied these fractions: (0.25)⁵ = 0.00097. Gradients at early layers vanished into floating-point zero, preventing networks from training deeper than 3 layers until the discovery of ReLU.",
    catastrophicScenario:
      "An engineer training an 8-layer NLP LSTM replaces Tanh with Sigmoid across all recurrent gates and hidden states. After 10 epochs, the training loss curve stays completely flat at 4.605 (random chance log(100)). Gradients measured at Layer 1 have magnitude 10⁻¹², causing zero parameter updates. Over $40,000 of cloud GPU compute is wasted on an untrainable frozen model.",
    systemImpact: [
      "Vanishing gradients: early layers receive near-zero updates, paralyzing feature representation learning.",
      "Exploding gradients: unbounded positive slopes compounding across deep un-normalized layers.",
      "Dying ReLU: negative activations mapped permanently to zero gradient, wasting GPU capacity on inert weights.",
      "Non-zero centered outputs (Sigmoid): induces zig-zagging gradient descent dynamics during weight updates.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "The Linear Collapse Proof: Consider a 3-layer linear network with activations f(z) = z: y = W₃(W₂(W₁x + b₁) + b₂) + b₃ = (W₃W₂W₁)x + (W₃W₂b₁ + W₃b₂ + b₃) = W_eff x + b_eff. Regardless of layer depth or width, a purely linear network cannot compute anything more complex than a simple linear regression hyperplane.",
      "The Gradient Propagation Equation: By the Chain Rule, the gradient of loss L with respect to pre-activation z_l is: δ_l = ∂L/∂z_l = (W_{l+1}ᵀ δ_{l+1}) ⊙ f'(z_l). The derivative f'(z_l) acts as a multiplicative gate. If |f'(z)| < 1 everywhere (as in Sigmoid where f' ≤ 0.25), gradients decay exponentially with depth L as (f')ᴸ → 0.",
      "Modern Solution (ReLU & GELU): ReLU has derivative f'(z) = 1 for all z > 0, completely eliminating vanishing gradients along active pathways. GELU weights inputs by their percentile in a standard normal distribution: GELU(x) = x · Φ(x), providing smooth non-monotonic curvature.",
    ],
    singleVsDistributed:
      "Activation functions are strictly element-wise operations with zero inter-neuron dependencies, making them trivially parallelizable across GPU threads. Modern frameworks fuse activations directly into GEMM matrix multiplications (e.g. cuDNN fused bias-add + GELU) to eliminate GPU global memory bandwidth bottlenecks.",
    semanticsAndGuarantees: [
      "Differentiability: Must have a well-defined sub-gradient everywhere. At z=0 for ReLU, frameworks adopt convention f'(0) = 0 or 0.5.",
      "Boundedness: Sigmoid maps to (0, 1); Tanh maps to (-1, 1); ReLU is bounded below by 0 but unbounded above [0, ∞).",
      "Zero-Centered Property: Tanh is zero-centered (mean near 0), which prevents bias shifts during gradient descent, unlike Sigmoid which is strictly positive.",
    ],
    keyAlgorithms: [
      {
        name: "Rectified Linear Unit (ReLU)",
        description:
          "f(z) = max(0, z); derivative is 1 if z > 0, else 0.",
        pros: "Fastest compute (single CPU/GPU instruction); derivative is 1 for positive inputs, eliminating vanishing gradients.",
        cons: "Dying ReLU problem for negative inputs; non-zero centered.",
      },
      {
        name: "Leaky ReLU / Parametric ReLU (PReLU)",
        description:
          "f(z) = z if z > 0, else α·z (typically α = 0.01).",
        pros: "Prevents dead neurons by ensuring a small non-zero gradient (α) always survives for negative inputs.",
        cons: "Introduces additional hyperparameter α (or learned parameter in PReLU).",
      },
      {
        name: "Gaussian Error Linear Unit (GELU)",
        description:
          "f(z) = z · Φ(z) ≈ 0.5 · z · (1 + tanh(√(2/π) · (z + 0.044715 · z³))).",
        pros: "Smooth, non-monotonic curve; state-of-the-art performance across Transformers and LLMs.",
        cons: "Slightly higher compute cost than ReLU without kernel fusion.",
      },
      {
        name: "Hyperbolic Tangent (Tanh)",
        description:
          "f(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ); zero-centered in (-1, 1). Derivative is 1 - f(z)².",
        pros: "Zero-centered; outputs can be positive or negative; effective in shallow networks and RNN gates.",
        cons: "Saturates at |z| > 2.5 with vanishing gradients (f' < 0.1).",
      },
    ],
  },

  visualizerType: "activation-functions",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Implement Forward Function & Numerical Clamping",
      summary: "Evaluate non-linear function with overflow protection.",
      explanation:
        "For exponential-based activations (Sigmoid, Tanh), clamp inputs to [-15, 15] to prevent float overflow in exp(z).",
      pseudocode: `def sigmoid(z):\n  z_safe = np.clip(z, -15.0, 15.0)\n  return 1.0 / (1.0 + np.exp(-z_safe))`,
      considerations: [
        "Use fast polynomial approximations for GELU to avoid expensive erf() integral computations.",
      ],
    },
    {
      stepNumber: 2,
      title: "Implement Exact Analytical Derivatives",
      summary: "Compute f'(z) for backward error propagation.",
      explanation:
        "Derivatives must be vectorized: for ReLU, grad = (z > 0).astype(float); for Sigmoid, s = sigmoid(z), grad = s * (1.0 - s); for Tanh, t = tanh(z), grad = 1.0 - t**2.",
      pseudocode: `def relu_derivative(z):\n  return (z > 0).astype(np.float32)`,
      considerations: [
        "Reusing forward activation outputs (e.g. s * (1 - s)) saves redundant exp() evaluations.",
      ],
    },
    {
      stepNumber: 3,
      title: "Verify Gradient Flow & Detect Saturation",
      summary: "Profile derivative magnitudes across batch distributions.",
      explanation:
        "Monitor the percentage of activations falling in saturation zones (|z| > 3 for Sigmoid/Tanh, z < 0 for ReLU) to catch vanishing gradient defects early.",
      considerations: [
        "If >50% of neurons in a layer are saturated, lower weight initialization scale or add LayerNorm.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "activations.py",
      code: `import numpy as np
from typing import Tuple

class Activations:
    """
    Vectorized activation functions and their analytical derivatives.
    """
    @staticmethod
    def relu(z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """ReLU: f(z) = max(0, z), f'(z) = 1 if z > 0 else 0."""
        a = np.maximum(0.0, z)
        grad = (z > 0.0).astype(np.float32)
        return a, grad

    @staticmethod
    def leaky_relu(z: np.ndarray, alpha: float = 0.01) -> Tuple[np.ndarray, np.ndarray]:
        """Leaky ReLU: avoids dead neurons with small negative slope."""
        a = np.where(z > 0.0, z, alpha * z)
        grad = np.where(z > 0.0, 1.0, alpha).astype(np.float32)
        return a, grad

    @staticmethod
    def sigmoid(z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Sigmoid: f(z) = 1 / (1 + e^-z), f'(z) = f(z) * (1 - f(z))."""
        z_safe = np.clip(z, -15.0, 15.0)
        a = 1.0 / (1.0 + np.exp(-z_safe))
        grad = a * (1.0 - a)
        return a, grad

    @staticmethod
    def tanh(z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Tanh: zero-centered, f'(z) = 1 - f(z)^2."""
        a = np.tanh(z)
        grad = 1.0 - (a ** 2)
        return a, grad

    @staticmethod
    def gelu(z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        GELU: Gaussian Error Linear Unit (Hendrycks & Gimpel).
        Approximation used in GPT and BERT.
        """
        const = np.sqrt(2.0 / np.pi)
        inner = const * (z + 0.044715 * (z ** 3))
        tanh_val = np.tanh(inner)
        a = 0.5 * z * (1.0 + tanh_val)
        
        # Analytical derivative
        sech2 = 1.0 - (tanh_val ** 2)
        d_inner = const * (1.0 + 3.0 * 0.044715 * (z ** 2))
        grad = 0.5 * (1.0 + tanh_val) + 0.5 * z * sech2 * d_inner
        return a, grad`,
      explanation:
        "Production Python implementation of modern deep learning activation functions. Returns both forward activation tensor and analytical derivative tensor in a single call.",
      keyDecisions: [
        "Used fast polynomial tanh approximation for GELU matching OpenAI GPT implementation.",
        "Clamped Sigmoid inputs to avoid float overflow.",
      ],
      complexityNotes:
        "Element-wise O(N) time and space. Easily vectorized across SIMD/AVX lanes.",
    },

    typescript: {
      filename: "Activations.ts",
      code: `export function evaluateActivation(
  type: "relu" | "sigmoid" | "tanh" | "gelu" | "leaky_relu",
  x: number
): { y: number; dy: number } {
  switch (type) {
    case "relu":
      return { y: Math.max(0, x), dy: x > 0 ? 1 : 0 };
    case "leaky_relu":
      return { y: x > 0 ? x : 0.05 * x, dy: x > 0 ? 1 : 0.05 };
    case "sigmoid": {
      const clamped = Math.max(-15, Math.min(15, x));
      const s = 1 / (1 + Math.exp(-clamped));
      return { y: s, dy: s * (1 - s) };
    }
    case "tanh": {
      const t = Math.tanh(x);
      return { y: t, dy: 1 - t * t };
    }
    case "gelu": {
      const inner = Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3));
      const tanhVal = Math.tanh(inner);
      const y = 0.5 * x * (1 + tanhVal);
      const sech2 = 1 - tanhVal * tanhVal;
      const dInner = Math.sqrt(2 / Math.PI) * (1 + 3 * 0.044715 * x * x);
      const dy = 0.5 * (1 + tanhVal) + 0.5 * x * sech2 * dInner;
      return { y, dy };
    }
  }
}`,
      explanation:
        "Lightweight TypeScript utility powering real-time curve rendering and instantaneous derivative evaluation.",
      keyDecisions: [
        "Direct analytical derivative calculations for microsecond SVG rendering.",
      ],
      complexityNotes:
        "O(1) time and memory.",
    },
  },

  edgeCases: [
    {
      scenario: "Extreme Sigmoid Saturation (|z| > 5.0)",
      consequence:
        "Sigmoid derivative drops to f'(z) < 0.006. In a 5-layer network, gradients shrink by (0.006)⁵ ≈ 7×10⁻¹², freezing model weights completely.",
      solution:
        "Migrate hidden layers to GELU or ReLU; retain Sigmoid exclusively for binary probability output calibration.",
    },
    {
      scenario: "Dead ReLU Epidemic (>40% of Layer)",
      consequence:
        "A large negative weight update causes a significant fraction of neurons to output 0.0 for all inputs. The network capacity drops proportionally, degrading performance.",
      solution:
        "Use LeakyReLU, Parametric ReLU, or GELU, and apply Layer Normalization before activations.",
    },
    {
      scenario: "Pure Linear Network (Missing Non-Linearity)",
      consequence:
        "An engineer forgets activation functions between dense layers. A 20-layer network behaves identically to a 1-layer linear regression model.",
      solution:
        "Add non-linear activation layers (ReLU / GELU) after every affine projection matrix multiply.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Memory Bandwidth Throttling from Element-Wise Operations",
        description:
          "In deep networks, element-wise activation functions require loading the activation tensor from high-bandwidth memory (HBM) to SRAM, computing f(z), and storing it back, bottlenecking GPU compute.",
        mitigation:
          "Use kernel fusion (TorchScript, TorchInductor, or Triton) to fuse Matrix Multiply + Bias Add + GELU into a single GPU kernel.",
      },
      {
        title: "Non-Differentiable Point Subgradient Instability",
        description:
          "At z=0, ReLU has no single derivative. Different numerical libraries handle z=0 differently (e.g. 0 vs 1), leading to non-deterministic training runs across platforms.",
        mitigation:
          "Standardize on PyTorch subgradient conventions (grad at 0 is 0); for smooth differentiability, adopt GELU or Swish.",
      },
    ],
    scaling10x: [
      "In modern LLM inference, replace GELU with SwiGLU (Swish Gated Linear Unit), which achieves 10-15% lower perplexity at equivalent compute budgets.",
      "Execute fused activations using FP8 Tensor Core hardware instructions (Ada Lovelace / Hopper architectures).",
    ],
    concurrencyRaceConditions: [
      "Activation functions are embarrassingly parallel element-wise transformations with zero shared state; perfectly thread-safe.",
    ],
    observability: {
      metrics: [
        "layer_activation_saturation_ratio (gauge)",
        "layer_gradient_norm_before_activation (histogram)",
        "layer_gradient_norm_after_activation (histogram)",
      ],
      logs: [
        "Log warning if saturation ratio in Sigmoid/Tanh exceeds 30%.",
      ],
      traces: [
        "OpenTelemetry span for 'activation.kernel_fused' capturing execution latency.",
      ],
    },
    securityNotes: [
      "Adversarial Saliency Attacks: Attackers exploit non-linear saturation regions to create inputs that appear visually identical to humans but trigger radically different feature activations.",
    ],
  },

  tradeoffs: [
    {
      approach: "ReLU",
      advantages: "Fastest execution; derivative of 1 prevents vanishing gradients; sparse activations.",
      disadvantages: "Dying ReLU problem; non-zero centered.",
      useWhen: "Computer vision, robotics, and mobile/edge embedded deep learning.",
    },
    {
      approach: "GELU / SwiGLU",
      advantages: "Smooth non-linear curvature; superior empirical performance across NLP & Vision Transformers.",
      disadvantages: "Higher mathematical compute cost without specialized fused kernels.",
      useWhen: "Transformer architectures, Large Language Models, and modern foundation models.",
    },
    {
      approach: "Sigmoid / Tanh",
      advantages: "Bounded output ranges (0, 1) or (-1, 1); zero-centered (Tanh).",
      disadvantages: "Severe vanishing gradients in deep networks.",
      useWhen: "Final output classification layer and recurrent gating mechanisms (LSTM forget gates).",
    },
  ],

  furtherReading: [
    {
      title: "Gaussian Error Linear Units (GELUs)",
      type: "Paper",
      authorOrOrg: "Dan Hendrycks, Kevin Gimpel (NeurIPS 2016)",
      description: "The seminal paper proposing GELU, the default activation for BERT, GPT, and modern LLMs.",
      url: "https://arxiv.org/abs/1606.08415",
    },
    {
      title: "GLU Variants Improve Transformer (SwiGLU)",
      type: "Paper",
      authorOrOrg: "Noam Shazeer (Google Research)",
      description: "How gating mechanisms combined with non-linear activations enhance Transformer representations.",
      url: "https://arxiv.org/abs/2002.05202",
    },
  ],
};
