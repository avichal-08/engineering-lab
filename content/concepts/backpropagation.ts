import { Concept } from "./types";

export const backpropagation: Concept = {
  slug: "backpropagation",
  title: "Backpropagation",
  shortDescription:
    "Propagate prediction error backward through arbitrary computation graphs using the multivariable Chain Rule to compute exact analytical parameter gradients.",
  category: "Deep Learning",
  track: "Deep Learning",
  difficulty: "Advanced",
  estimatedTime: "~30 min",
  topics: [
    "Reverse-Mode Automatic Differentiation",
    "Multivariable Chain Rule",
    "Error Deltas (δ = ∂L/∂z)",
    "Parameter Gradients (∂L/∂W, ∂L/∂b)",
    "Gradient Checking & Finite Differences",
    "Exploding & Vanishing Gradients",
  ],

  overview: {
    problemStatement:
      "A deep neural network contains millions to hundreds of billions of interconnected parameters. To train the network via gradient descent, we must calculate the exact partial derivative of the scalar loss L with respect to every individual weight: ∂L/∂w_ij. Forward-mode numerical differentiation requires O(P) full network evaluations (where P is parameter count), which would take centuries. Backpropagation computes exact gradients for all P parameters in a single backward pass of complexity O(1) relative to forward evaluation.",
    whenToUse: [
      "Training all deep learning architectures: Multi-Layer Perceptrons, CNNs, RNNs, and Transformers.",
      "Optimizing differentiable physics simulations and neural ODEs.",
      "Computing input feature attributions and gradient-based saliency maps (Integrated Gradients).",
    ],
    whenNotToUse: [
      "Non-differentiable systems containing discrete sampling steps without continuous reparameterization tricks (e.g. Gumbel-Softmax / REINFORCE).",
      "Black-box optimization where objective equations and internal computation graphs are inaccessible (use Evolutionary Strategies or Bayesian Optimization).",
    ],
    coreInvariant:
      "The adjoint state (error delta) δ_l = ∂L/∂z_l at layer l is recursively computed from the subsequent layer's adjoint δ_{l+1} via the transpose weight matrix: δ_l = (δ_{l+1} W_{l+1}ᵀ) ⊙ f'(z_l). The parameter gradient is the outer product of incoming activations and outgoing error deltas: ∂L/∂W_l = A_{l-1}ᵀ · δ_l.",
  },

  whyItExists: {
    realWorldProblem:
      "Consider a moderate model like ResNet-50 with 25 million weights. Computing gradients via numerical approximation (f(w + ε) - f(w)) / ε requires evaluating the 50-layer network 25,000,000 times for a single gradient step. At 10 milliseconds per evaluation, one parameter update would take 3 days. Backpropagation evaluates the forward pass once and backward pass once, completing the update in 25 milliseconds—a 10,000,000x speedup.",
    catastrophicScenario:
      "An engineer writes a custom CUDA kernel for a specialized loss function. Due to an indexing typo, the backward pass transposes weight matrix W instead of Wᵀ when backpropagating error deltas. The network appears to train initially because loss decreases slightly on early epochs via bias updates, but soon gradient norms explode to 10²⁴, corrupting all layer weights into NaNs. The bug wastes 2 weeks of debugging because forward predictions evaluated without errors.",
    systemImpact: [
      "Numerical differentiation intractability: O(P) vs O(1) complexity makes deep learning mathematically viable.",
      "Vanishing or exploding gradients compounding across deep graph paths.",
      "Memory overhead: intermediate activation tensors must be retained in VRAM until the backward pass executes.",
      "Silent gradient bugs: training can appear to progress even when custom backward implementations are mathematically incorrect.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Backpropagation is an efficient implementation of reverse-mode automatic differentiation applied to directed acyclic computation graphs.",
      "Step 1 (Forward Pass): Inputs propagate from layer 1 to L. Each layer l computes pre-activation z_l = A_{l-1} W_l + b_l and activation A_l = f(z_l). Intermediate tensors are stored in memory.",
      "Step 2 (Loss Gradient): At the final layer L, the scalar loss L(ŷ, y) is evaluated, and the initial error delta is computed: δ_L = ∂L/∂z_L (e.g. for MSE and linear output, δ_L = ŷ - y; for Cross-Entropy and Softmax, δ_L = p - y).",
      "Step 3 (Backward Pass via Chain Rule): For each layer l from L down to 1, error delta δ_l is backpropagated to layer l-1: δ_{l-1} = (δ_l W_lᵀ) ⊙ f'(z_{l-1}).",
      "Step 4 (Parameter Gradients): The gradient of the loss with respect to weights and biases is: ∂L/∂W_l = A_{l-1}ᵀ · δ_l, and ∂L/∂b_l = ∑_{samples} δ_l.",
    ],
    singleVsDistributed:
      "On single GPUs, PyTorch autograd builds dynamic DAGs of execution nodes. In Pipeline Parallelism (GPipe / DeepSpeed) across multiple GPUs, activations from forward micro-batches are buffered in GPU memory across ranks until corresponding backward micro-batches return, creating a pipeline 'bubble' that requires 1F1B (One Forward, One Backward) scheduling.",
    semanticsAndGuarantees: [
      "Exact Mathematical Gradients: Backpropagation computes analytical partial derivatives with machine-precision floating-point accuracy, free from numerical truncation error.",
      "Computational Complexity: The backward pass has computational cost proportional to at most 2x the forward pass, regardless of the number of parameters.",
    ],
    keyAlgorithms: [
      {
        name: "Reverse-Mode Automatic Differentiation (Autograd)",
        description:
          "Records forward operations on a tape / graph; traverses backward using vector-Jacobian products (VJPs).",
        pros: "O(1) evaluations relative to parameter count; handles arbitrary control flow.",
        cons: "Requires storing all forward activations in memory.",
      },
      {
        name: "Gradient Checkpointing (Activation Recomputation)",
        description:
          "Discards intermediate activations during forward pass; recomputes them on-the-fly during the backward pass.",
        pros: "Reduces VRAM memory consumption from O(L) to O(√L).",
        cons: "Adds ~30% computational overhead due to re-evaluating forward layers.",
      },
    ],
  },

  visualizerType: "backpropagation",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Forward Pass & Cache Intermediate States",
      summary: "Evaluate layers sequentially and retain input and activation tensors.",
      explanation:
        "Compute z₁ = x W₁ + b₁, a₁ = f(z₁), z₂ = a₁ W₂ + b₂, ŷ = z₂. Store x, z₁, a₁, z₂ in a forward cache.",
      pseudocode: `cache = {'x': x, 'z1': z1, 'a1': a1, 'z2': z2}`,
      considerations: [
        "In PyTorch, tensors with requires_grad=True automatically attach to the computation tape.",
      ],
    },
    {
      stepNumber: 2,
      title: "Compute Output Adjoint (δ_output)",
      summary: "Calculate partial derivative of loss with respect to final pre-activation.",
      explanation:
        "For Mean Squared Error L = 0.5(ŷ - y)², ∂L/∂ŷ = (ŷ - y). Since final layer is linear (ŷ = z₂), δ₂ = ∂L/∂z₂ = ŷ - y.",
      pseudocode: `delta2 = y_hat - y`,
      considerations: [
        "Softmax paired with Cross-Entropy elegantly simplifies to δ = p - y, avoiding numerical division by zero.",
      ],
    },
    {
      stepNumber: 3,
      title: "Propagate Error Delta to Hidden Layer",
      summary: "Apply transpose weight multiplication and activation derivative.",
      explanation:
        "Multiply δ₂ by W₂ᵀ to route error back across the layer, then multiply element-wise by f'(z₁): δ₁ = (δ₂ · W₂ᵀ) * f'(z₁).",
      pseudocode: `delta1 = (delta2 @ W2.T) * relu_deriv(z1)`,
      considerations: [
        "Dimension verification: if δ₂ is [B, d_out] and W₂ is [d_hidden, d_out], δ₂ @ W₂.T yields [B, d_hidden].",
      ],
    },
    {
      stepNumber: 4,
      title: "Compute Parameter Gradients & Gradient Checking",
      summary: "Evaluate ∂L/∂W and ∂L/∂b via matrix outer products.",
      explanation:
        "Weight gradients are given by: dW₂ = a₁ᵀ · δ₂, db₂ = sum(δ₂, axis=0), dW₁ = xᵀ · δ₁, db₁ = sum(δ₁, axis=0). Verify with finite differences: (f(w+ε) - f(w-ε)) / (2ε).",
      pseudocode: `dW2 = a1.T @ delta2\ndb2 = np.sum(delta2, axis=0, keepdims=True)\ndW1 = x.T @ delta1\ndb1 = np.sum(delta1, axis=0, keepdims=True)`,
      considerations: [
        "Gradient check relative difference |grad_analytic - grad_num| / (|grad_analytic| + |grad_num|) must be < 1e-6.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "mlp_backprop.py",
      code: `import numpy as np
from typing import Dict, Tuple

class TwoLayerNeuralNetwork:
    """
    Two-Layer Fully Connected Neural Network with exact Chain Rule Backpropagation.
    Architecture: Input -> Dense(Hidden, ReLU) -> Dense(Output, Linear) -> MSE Loss.
    """
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, lr: float = 0.05):
        self.lr = lr
        # He initialization for hidden layer
        self.W1 = np.random.randn(input_dim, hidden_dim) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros((1, hidden_dim))
        # Xavier initialization for output layer
        self.W2 = np.random.randn(hidden_dim, output_dim) * np.sqrt(2.0 / (hidden_dim + output_dim))
        self.b2 = np.zeros((1, output_dim))

    def forward(self, X: np.ndarray) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        """Forward pass caching intermediate tensors."""
        z1 = np.dot(X, self.W1) + self.b1
        a1 = np.maximum(0.0, z1)  # ReLU
        z2 = np.dot(a1, self.W2) + self.b2
        y_hat = z2  # Linear output
        cache = {"X": X, "z1": z1, "a1": a1, "z2": z2, "y_hat": y_hat}
        return y_hat, cache

    def backward(self, cache: Dict[str, np.ndarray], y_true: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Backward pass using Multivariable Chain Rule.
        Computes analytical gradients: dW1, db1, dW2, db2.
        """
        N = cache["X"].shape[0]
        y_hat = cache["y_hat"]
        a1 = cache["a1"]
        z1 = cache["z1"]
        X = cache["X"]

        # Step 1: Loss gradient w.r.t final pre-activation (MSE Loss: L = (1/2N) * sum((y_hat - y)^2))
        delta2 = (y_hat - y_true) / N  # [N, output_dim]

        # Step 2: Output layer parameter gradients
        dW2 = np.dot(a1.T, delta2)     # [hidden_dim, output_dim]
        db2 = np.sum(delta2, axis=0, keepdims=True)

        # Step 3: Backpropagate error delta to hidden layer through ReLU
        # delta1 = (delta2 @ W2.T) * relu'(z1)
        grad_a1 = np.dot(delta2, self.W2.T)  # [N, hidden_dim]
        delta1 = grad_a1 * (z1 > 0.0).astype(np.float64)  # [N, hidden_dim]

        # Step 4: Hidden layer parameter gradients
        dW1 = np.dot(X.T, delta1)      # [input_dim, hidden_dim]
        db1 = np.sum(delta1, axis=0, keepdims=True)

        return {"dW1": dW1, "db1": db1, "dW2": dW2, "db2": db2}

    def step(self, grads: Dict[str, np.ndarray]):
        """Apply gradient descent parameter updates."""
        self.W1 -= self.lr * grads["dW1"]
        self.b1 -= self.lr * grads["db1"]
        self.W2 -= self.lr * grads["dW2"]
        self.b2 -= self.lr * grads["db2"]

    def train_step(self, X: np.ndarray, y: np.ndarray) -> float:
        """Executes full Forward -> Backward -> Step training loop."""
        y_hat, cache = self.forward(X)
        loss = 0.5 * np.mean((y_hat - y) ** 2)
        grads = self.backward(cache, y)
        self.step(grads)
        return float(loss)`,
      explanation:
        "Complete, runnable from-scratch implementation of backpropagation in pure NumPy without external autograd libraries. Demonstrates explicit error delta propagation and outer product parameter updates.",
      keyDecisions: [
        "Normalizes loss and gradients by batch size N to ensure learning rate stability across varying batch sizes.",
        "Uses keepdims=True on bias sum reductions to preserve 2D tensor shape compatibility.",
      ],
      complexityNotes:
        "Forward Complexity: O(N · (d_in · d_hid + d_hid · d_out)). Backward Complexity: identical O(N · (d_in · d_hid + d_hid · d_out)).",
    },

    typescript: {
      filename: "Backpropagation.ts",
      code: `export class BackpropagationDemo {
  public w1: number = 0.5;
  public w2: number = -0.3;
  public lr: number = 0.1;

  /**
   * Evaluates single-path network: x -> z1 (w1) -> a1 (sigmoid) -> z2 (w2) -> y_hat.
   */
  public step(x: number, yTrue: number) {
    // 1. Forward
    const z1 = x * this.w1;
    const a1 = 1 / (1 + Math.exp(-z1));
    const yHat = a1 * this.w2;
    const loss = 0.5 * Math.pow(yHat - yTrue, 2);

    // 2. Backward
    const dLossDYHat = yHat - yTrue;
    const dLossDW2 = dLossDYHat * a1;

    const dLossDA1 = dLossDYHat * this.w2;
    const dSigmoid = a1 * (1 - a1);
    const delta1 = dLossDA1 * dSigmoid;
    const dLossDW1 = delta1 * x;

    // 3. Update
    this.w1 -= this.lr * dLossDW1;
    this.w2 -= this.lr * dLossDW2;

    return { loss, yHat, dLossDW1, dLossDW2 };
  }
}`,
      explanation:
        "TypeScript implementation showing the scalar Chain Rule step-by-step for browser visualizers.",
      keyDecisions: [
        "Unrolls scalar derivatives to illustrate intermediate partials clearly.",
      ],
      complexityNotes:
        "O(1) time and space.",
    },
  },

  edgeCases: [
    {
      scenario: "Gradient Explosion in Deep Networks",
      consequence:
        "If weight spectral radius > 1 and activations are unbounded, error deltas multiply exponentially backward, causing float overflow and NaN weights.",
      solution:
        "Apply Gradient Clipping (torch.nn.utils.clip_grad_norm_), use residual skip connections (ResNet), or add Layer Normalization.",
    },
    {
      scenario: "Symmetry Trap (All Weights Initialized to Zero)",
      consequence:
        "Every neuron computes identical forward values and receives identical gradients. Neurons update identically, rendering the hidden layer computationally equivalent to a single neuron.",
      solution:
        "Always use random variance-scaled initialization (He or Xavier).",
    },
    {
      scenario: "Vanishing Gradients through Saturated Activations",
      consequence:
        "In deep Sigmoid networks, repeatedly multiplying by f'(z) ≤ 0.25 drives gradients at early layers to zero, freezing feature learning.",
      solution:
        "Use ReLU, LeakyReLU, or GELU, and use Cross-Entropy loss instead of MSE for classification.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "VRAM Activation Stash Exhaustion",
        description:
          "In deep Transformers (e.g. 70B parameters), storing forward activation tensors for the backward pass consumes up to 8x more memory than model weights.",
        mitigation:
          "Enable Activation Checkpointing (recomputing activations during backward pass) and FlashAttention (which fuses attention backward without materializing the N×N matrix).",
      },
      {
        title: "Silent Gradient Masking Bug",
        description:
          "Accidentally detaching a tensor from the computation graph (.detach() in PyTorch) silences gradient flow without throwing runtime errors.",
        mitigation:
          "Run finite-difference numerical gradient checking on all custom loss layers during CI/CD test suites.",
      },
    ],
    scaling10x: [
      "Pipeline Parallelism with 1F1B Scheduling: Interleave forward and backward micro-batches across pipeline ranks to minimize GPU idle bubble.",
      "Zero Redundancy Optimizer (ZeRO-Stage 3): Shard optimizer states, gradients, and model parameters across all GPUs, eliminating replicated memory.",
    ],
    concurrencyRaceConditions: [
      "In distributed data parallel (DDP) training, gradient accumulation across micro-batches must not trigger AllReduce synchronization until the final accumulation step; use model.no_sync() context manager.",
    ],
    observability: {
      metrics: [
        "gradient_global_l2_norm (histogram)",
        "gradient_layer_norm{layer_name} (gauge)",
        "backward_pass_duration_ms (histogram)",
      ],
      logs: [
        "Emit alert if gradient norm drops below 1e-7 (vanishing) or exceeds 100.0 (exploding).",
      ],
      traces: [
        "OpenTelemetry span for 'autograd.backward' capturing backward pass execution duration.",
      ],
    },
    securityNotes: [
      "Membership Inference Attacks: By analyzing gradient norms during fine-tuning, attackers can determine whether a specific private document was included in the model's training set.",
    ],
  },

  tradeoffs: [
    {
      approach: "Reverse-Mode Automatic Differentiation (Backprop)",
      advantages: "Computes gradients for all parameters in a single pass O(1); scales to billions of parameters.",
      disadvantages: "Requires storing all forward intermediate activations in memory.",
      useWhen: "Functions with many inputs (millions of parameters) and few scalar outputs (single scalar loss).",
    },
    {
      approach: "Forward-Mode Automatic Differentiation",
      advantages: "Does not require storing forward activations in memory; constant memory footprint.",
      disadvantages: "Requires P forward passes to compute gradients for P parameters; intractable for deep networks.",
      useWhen: "Functions with few inputs and many outputs (e.g. computing full Jacobian matrices of physical simulations).",
    },
    {
      approach: "Activation Checkpointing",
      advantages: "Trades ~30% additional compute to reduce peak activation memory by 70%.",
      disadvantages: "Increases total epoch training wall-clock time.",
      useWhen: "Training large language models where VRAM capacity is the primary scaling bottleneck.",
    },
  ],

  furtherReading: [
    {
      title: "Learning Representations by Back-Propagating Errors",
      type: "Paper",
      authorOrOrg: "David E. Rumelhart, Geoffrey E. Hinton, Ronald J. Williams (Nature 1986)",
      description: "The historic Nature publication that popularized backpropagation for multi-layer neural networks.",
      url: "https://www.nature.com/articles/323533a0",
    },
    {
      title: "Automatic Differentiation in Machine Learning: A Survey",
      type: "Paper",
      authorOrOrg: "Atilim Gunes Baydin et al.",
      description: "Comprehensive mathematical guide comparing reverse-mode, forward-mode, and symbolic differentiation.",
      url: "https://arxiv.org/abs/1502.05767",
    },
  ],
};
