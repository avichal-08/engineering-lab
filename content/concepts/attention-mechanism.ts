import { Concept } from "./types";

export const attentionMechanism: Concept = {
  slug: "attention",
  title: "Attention Mechanism",
  shortDescription:
    "Dynamically weight context across sequence positions via Scaled Dot-Product Query-Key-Value routing—the architectural engine of modern Transformers and LLMs.",
  category: "Deep Learning",
  track: "Deep Learning",
  difficulty: "Advanced",
  estimatedTime: "~30 min",
  topics: [
    "Scaled Dot-Product Attention",
    "Query, Key, and Value Projections (Q, K, V)",
    "Softmax Temperature Scaling (1 / √d_k)",
    "Self-Attention vs Cross-Attention",
    "Multi-Head Attention (MHA)",
    "The Quadratic Context Bottleneck (O(N²))",
    "FlashAttention & Memory IO-Awareness",
  ],

  overview: {
    problemStatement:
      "Recurrent Neural Networks (RNNs / LSTMs) process sequential data token-by-token (h_t = f(h_{t-1}, x_t)). This sequential bottleneck creates two fatal flaws: first, it prevents parallel GPU execution across sequence length; second, distant tokens must compress into a single fixed-size vector, causing catastrophic information loss across long context windows (>500 tokens). The Attention Mechanism eliminates sequential recurrence by allowing every token to directly query and attend to all other tokens in a single parallel operation.",
    whenToUse: [
      "Large Language Models (GPT-4, LLaMA, Claude) and generative text completion.",
      "Sequence-to-sequence translation, document summarization, and code comprehension.",
      "Vision Transformers (ViT) treating image patches as visual tokens.",
      "Multimodal models fusing text, audio, and visual embeddings into shared latent spaces.",
    ],
    whenNotToUse: [
      "Extreme-length streaming sequences (>1M tokens) on hardware with limited VRAM without linear attention (State Space Models / Mamba) or sparse attention.",
      "Simple short-sequence classification tasks where an MLP or LightGBM model achieves equivalent accuracy with 100x lower latency.",
      "Edge microcontrollers with microsecond latency budgets where O(N²) matrix multiplications exceed thermal envelopes.",
    ],
    coreInvariant:
      "Scaled Dot-Product Attention computes output representations as a weighted sum of Value vectors, where weights are dynamically determined by the normalized similarity between Query and Key vectors: Attention(Q, K, V) = softmax((Q Kᵀ) / √d_k) · V.",
  },

  whyItExists: {
    realWorldProblem:
      "In the sentence 'The animal didn't cross the street because it was tired', determining what 'it' refers to requires resolving linguistic co-reference. An RNN processing 50 tokens must preserve the memory of 'animal' across intermediate words without degradation. In self-attention, token 'it' computes a dot product with all preceding token keys; the match between Query('it') and Key('animal') produces a high score, allowing Value('animal') to directly inform the representation of 'it' in a single step.",
    catastrophicScenario:
      "An AI engineer implements custom self-attention for a 4,096-token legal contract analyzer. Due to a transcription error, the engineer omits the scaling factor 1 / √d_k before the Softmax operation. With embedding dimension d_k = 128, dot products Q · Kᵀ reach magnitudes around ±45. Passing values of +45 into Softmax causes the probability distribution to collapse into a one-hot vector (argmax) with near-zero gradients (∂softmax/∂z ≈ 0). Backpropagation vanishes completely; the $250,000 fine-tuning run halts with frozen weights.",
    systemImpact: [
      "The Quadratic Memory Wall: an N×N attention matrix requires O(N²) memory, causing VRAM exhaustion at 32k+ tokens.",
      "Softmax saturation: omitting the 1 / √d_k scale factor extinguishes backpropagated gradients.",
      "Permutation blindness: without explicit Positional Encodings (RoPE), self-attention is invariant to word order.",
      "GPU memory bandwidth bottleneck: standard attention materializes intermediate N×N attention matrices in HBM rather than SRAM.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Attention treats representation learning as a differentiable soft dictionary lookup. Given input sequence X ∈ ℝ^{N × d_model}, inputs are projected into three distinct spaces via learned weight matrices: Queries Q = X W_Q, Keys K = X W_K, and Values V = X W_V.",
      "Queries represent 'what information this token is looking for'. Keys represent 'what information this token contains'. Values represent 'the content payload to transmit'.",
      "Step 1 (Raw Similarity Scores): Compute all pairwise token affinities via matrix multiplication: S = Q Kᵀ ∈ ℝ^{N × N}.",
      "Step 2 (Variance Scaling): Divide raw scores by √d_k. If components of Q and K are independent zero-mean unit-variance variables, their dot product has variance d_k. Dividing by √d_k restores unit variance, preventing Softmax from saturating.",
      "Step 3 (Probability Normalization): Apply row-wise Softmax: A = softmax(S / √d_k). Matrix A is an N×N attention map where row i sums to 1.0, representing the attention weights token i assigns to all tokens j.",
      "Step 4 (Value Aggregation): Compute final contextualized embeddings: Output = A · V ∈ ℝ^{N × d_v}.",
    ],
    singleVsDistributed:
      "Computing full self-attention requires O(N²) FLOPs and O(N²) VRAM. In multi-GPU distributed training (Megatron-LM Tensor Parallelism), Multi-Head Attention splits head projections across GPUs: each GPU processes H/P heads independently without inter-GPU communication until the final output projection All-Reduce.",
    semanticsAndGuarantees: [
      "Direct O(1) Path Length: Any two tokens in a sequence interact directly via a single dot product, eliminating the O(N) information decay path of RNNs.",
      "Causal Masking: In autoregressive language modeling (decoder-only GPT), future tokens are masked out by setting upper-triangular scores to -∞ before Softmax, ensuring token i cannot attend to token j > i.",
      "Multi-Head Diversity: Multi-Head Attention splits the model dimension into h heads, allowing the model to simultaneously attend to information from different representation subspaces (e.g. syntactic agreement in Head 1, semantic coreference in Head 2).",
    ],
    keyAlgorithms: [
      {
        name: "Scaled Dot-Product Attention (Vaswani et al.)",
        description:
          "Attention(Q, K, V) = softmax(QKᵀ / √d_k) V. The foundational formula of the Transformer architecture.",
        pros: "Highly parallelizable on matrix tensor cores; direct global context routing.",
        cons: "Quadratic O(N²) memory and compute scaling with sequence length N.",
      },
      {
        name: "FlashAttention (Dao et al.)",
        description:
          "Fuses the attention computation into a single GPU SRAM tile using online softmax rescaling, never materializing the large N×N attention matrix in GPU HBM.",
        pros: "2x-4x wall-clock speedup; reduces peak VRAM from O(N²) to O(N); enables 128k+ context windows.",
        cons: "Requires low-level hardware CUDA / Triton programming.",
      },
      {
        name: "Multi-Query Attention (MQA) & Grouped-Query Attention (GQA)",
        description:
          "Shares Key and Value heads across multiple Query heads (e.g. 8 KV heads for 64 Query heads in LLaMA-3).",
        pros: "Reduces Key-Value (KV) cache memory bandwidth by up to 8x during autoregressive decoding.",
        cons: "Negligible loss in expressiveness compared to full Multi-Head Attention.",
      },
    ],
  },

  visualizerType: "attention",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Project Linear Query, Key, and Value Tensors",
      summary: "Map input embeddings into specialized functional subspaces.",
      explanation:
        "Multiply input token matrix X (shape [N, d_model]) by projection weights W_q, W_k, W_v to produce Q, K, V (each shape [N, d_k]).",
      pseudocode: `Q = X @ W_q\nK = X @ W_k\nV = X @ W_v`,
      considerations: [
        "In multi-head attention, reshape tensors to [Batch, Num_Heads, Seq_Len, Head_Dim].",
      ],
    },
    {
      stepNumber: 2,
      title: "Compute Scaled Dot-Product Scores",
      summary: "Calculate pairwise similarity and scale by inverse square root of dimension.",
      explanation:
        "Compute raw matrix product S = Q · Kᵀ and divide every element by sqrt(d_k) to control variance.",
      pseudocode: `scale = 1.0 / np.sqrt(d_k)\nscores = (Q @ K.T) * scale`,
      considerations: [
        "Never omit the scale factor; unscaled dot products saturate softmax into zero-gradient argmax states.",
      ],
    },
    {
      stepNumber: 3,
      title: "Apply Causal Masking (for Autoregressive Decoders)",
      summary: "Mask future sequence positions to prevent lookahead cheating.",
      explanation:
        "Create an upper-triangular matrix of -infinity above the diagonal. Add this mask to the scaled scores so future positions receive 0 probability after Softmax.",
      pseudocode: `mask = np.triu(np.full((N, N), -np.inf), k=1)\nscores = scores + mask`,
      considerations: [
        "Use -1e9 or -np.inf so exp(-inf) evaluates to strictly 0.0.",
      ],
    },
    {
      stepNumber: 4,
      title: "Apply Softmax & Weighted Value Accumulation",
      summary: "Normalize scores to probabilities and multiply by Value matrix.",
      explanation:
        "Compute A = softmax(scores, axis=-1) and aggregate values: Output = A · V.",
      pseudocode: `weights = np.exp(scores - np.max(scores, axis=-1, keepdims=True))\nweights = weights / np.sum(weights, axis=-1, keepdims=True)\noutput = weights @ V`,
      considerations: [
        "Subtract max(scores) along rows before exp() to prevent floating-point overflow.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "attention.py",
      code: `import numpy as np
from typing import Optional, Tuple

class ScaledDotProductAttention:
    """
    Production-grade Scaled Dot-Product Attention in pure NumPy.
    Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V
    """
    def __init__(self, d_k: int):
        self.d_k = d_k
        self.scale = 1.0 / np.sqrt(float(d_k))

    def forward(
        self,
        Q: np.ndarray,
        K: np.ndarray,
        V: np.ndarray,
        mask: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes scaled dot-product attention.
        Q: [batch_size, seq_len_q, d_k]
        K: [batch_size, seq_len_k, d_k]
        V: [batch_size, seq_len_k, d_v]
        mask: Optional boolean or additive mask [seq_len_q, seq_len_k]
        Returns: (output, attention_weights)
        """
        # Step 1: Pairwise dot products [batch_size, seq_len_q, seq_len_k]
        scores = np.matmul(Q, np.swapaxes(K, -1, -2)) * self.scale

        # Step 2: Apply mask (e.g. causal decoder mask)
        if mask is not None:
            # Add -1e9 to masked positions
            scores = np.where(mask, scores, -1e9)

        # Step 3: Numerically stable Softmax along the last dimension
        max_scores = np.max(scores, axis=-1, keepdims=True)
        exp_scores = np.exp(scores - max_scores)
        attention_weights = exp_scores / (np.sum(exp_scores, axis=-1, keepdims=True) + 1e-12)

        # Step 4: Weighted sum of Value vectors
        output = np.matmul(attention_weights, V)

        return output, attention_weights

class MultiHeadAttention:
    """Multi-Head Attention projecting across h independent subspaces."""
    def __init__(self, d_model: int = 64, num_heads: int = 4):
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        # Learned projection matrices
        limit = np.sqrt(2.0 / d_model)
        self.W_q = np.random.randn(d_model, d_model) * limit
        self.W_k = np.random.randn(d_model, d_model) * limit
        self.W_v = np.random.randn(d_model, d_model) * limit
        self.W_o = np.random.randn(d_model, d_model) * limit

        self.attention = ScaledDotProductAttention(self.d_k)

    def forward(self, X: np.ndarray) -> np.ndarray:
        batch_size, seq_len, _ = X.shape

        # Linear projections
        Q = np.dot(X, self.W_q).reshape(batch_size, seq_len, self.num_heads, self.d_k).swapaxes(1, 2)
        K = np.dot(X, self.W_k).reshape(batch_size, seq_len, self.num_heads, self.d_k).swapaxes(1, 2)
        V = np.dot(X, self.W_v).reshape(batch_size, seq_len, self.num_heads, self.d_k).swapaxes(1, 2)

        # Parallel head attention
        out, _ = self.attention.forward(Q, K, V)

        # Concatenate heads and apply final linear projection
        out = out.swapaxes(1, 2).reshape(batch_size, seq_len, self.d_model)
        return np.dot(out, self.W_o)`,
      explanation:
        "Complete, vectorized NumPy implementation of Scaled Dot-Product Attention and Multi-Head Attention. Features numerical softmax stabilization, causal masking support, and tensor shape manipulation matching PyTorch nn.MultiheadAttention.",
      keyDecisions: [
        "Used np.swapaxes for multi-head tensor batching to execute all heads in parallel.",
        "Applied max subtraction inside softmax to prevent exp() float overflow.",
      ],
      complexityNotes:
        "Compute Complexity: O(N² · d_model). Memory Complexity: O(N² · num_heads) for attention weights.",
    },

    typescript: {
      filename: "Attention.ts",
      code: `export function scaledDotProductAttention(
  query: number[],
  keys: number[][],
  values: number[][],
  temperature: number = 1.0
): { output: number[]; weights: number[] } {
  const dK = query.length;
  const scale = 1 / (Math.sqrt(dK) * temperature);

  // Compute raw dot products
  const rawScores = keys.map((key) => {
    let dot = 0;
    for (let i = 0; i < dK; i++) {
      dot += query[i] * key[i];
    }
    return dot * scale;
  });

  // Numerically stable Softmax
  const maxScore = Math.max(...rawScores);
  const expScores = rawScores.map((s) => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const weights = expScores.map((e) => e / sumExp);

  // Weighted aggregation of Values
  const dV = values[0].length;
  const output = new Array(dV).fill(0);
  for (let j = 0; j < values.length; j++) {
    for (let d = 0; d < dV; d++) {
      output[d] += weights[j] * values[j][d];
    }
  }

  return { output, weights };
}`,
      explanation:
        "TypeScript implementation powering interactive browser attention arc animations, co-reference resolution, and dynamic temperature exploration.",
      keyDecisions: [
        "Includes interactive temperature scaling factor to visualize softmax sharpness vs entropy.",
      ],
      complexityNotes:
        "O(N · d) time, O(N) space.",
    },
  },

  edgeCases: [
    {
      scenario: "Missing Scaling Factor (1 / √d_k)",
      consequence:
        "For large d_k (e.g. 128), dot products grow large in magnitude, pushing Softmax outputs to 0.0 or 1.0. Gradients vanish completely during backpropagation, halting model training.",
      solution:
        "Always divide raw dot products by √d_k before applying Softmax.",
    },
    {
      scenario: "Quadratic Context Memory Wall (O(N²))",
      consequence:
        "At 128k context length, materializing an N×N attention matrix in float16 requires 128,000 × 128,000 × 2 bytes ≈ 32.7 GB of VRAM per attention head per layer, immediately triggering CUDA OOM.",
      solution:
        "Use FlashAttention-2 / FlashAttention-3, which tiles the computation and executes online softmax in fast GPU SRAM without saving the full N×N matrix to HBM.",
    },
    {
      scenario: "Permutation Invariance (Order Blindness)",
      consequence:
        "Because attention computes unordered set operations (∑ a_j v_j), the sentence 'Dog bites man' produces the exact same representation as 'Man bites dog' without positional signals.",
      solution:
        "Add or multiply Positional Encodings: Rotary Position Embeddings (RoPE) or ALiBi.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "KV Cache GPU Memory Exhaustion During Decoding",
        description:
          "In high-throughput LLM serving (vLLM / TensorRT-LLM), storing Key and Value tensors for thousands of concurrent generation requests exhausts GPU VRAM, causing server thrashing.",
        mitigation:
          "Deploy PagedAttention (virtual memory paging for KV cache), Grouped-Query Attention (GQA), and KV Cache FP8 quantization.",
      },
      {
        title: "Attention Sink Phenomemon in Long Sequences",
        description:
          "LLMs allocate disproportionately large attention weights to the very first token (token 0) regardless of semantic relevance, causing perplexity spikes if initial tokens are evicted from rolling caches.",
        mitigation:
          "Retain the initial 4 attention sink tokens permanently in the KV cache during streaming generation (StreamingLLM).",
      },
    ],
    scaling10x: [
      "Use FlashAttention-3 with FP8 Tensor Cores and asynchronous ping-pong TMA (Tensor Memory Accelerator) on NVIDIA Hopper/Blackwell GPUs.",
      "Employ Context Parallelism (Ring Attention / DeepSpeed Ulysses) to distribute sequence length across 64 GPUs, enabling 1M+ token context windows.",
    ],
    concurrencyRaceConditions: [
      "In continuous batching LLM serving engines, concurrent user requests share the global PagedAttention memory pool; KV-cache block allocation must be coordinated via thread-safe atomic free-lists.",
    ],
    observability: {
      metrics: [
        "llm_kv_cache_usage_percent (gauge)",
        "attention_entropy_per_layer (gauge)",
        "flash_attention_kernel_latency_us (histogram)",
      ],
      logs: [
        "Log warning if attention entropy collapses to < 0.1 (model repetition / degeneration loop).",
      ],
      traces: [
        "OpenTelemetry span for 'attention.flash_attn_varlen' capturing prompt and context lengths.",
      ],
    },
    securityNotes: [
      "Attention Poisoning / Prompt Injection: Malicious tokens placed in retrieved documents can hijack query-key routing, forcing attention heads to focus entirely on attacker instructions while ignoring user context.",
    ],
  },

  tradeoffs: [
    {
      approach: "Standard Multi-Head Attention (MHA)",
      advantages: "Maximum representational expressiveness; each head maintains independent Q, K, V subspaces.",
      disadvantages: "Massive KV cache memory footprint during autoregressive serving.",
      useWhen: "Pre-training encoder models (BERT) or smaller foundation models.",
    },
    {
      approach: "Grouped-Query Attention (GQA)",
      advantages: "Reduces KV cache size by 4x-8x while preserving 99% of MHA model quality.",
      disadvantages: "Requires slightly more complex projection reshaping logic.",
      useWhen: "Modern Large Language Models (LLaMA-3, Mistral, Gemma).",
    },
    {
      approach: "Linear Attention / State Space Models (Mamba)",
      advantages: "O(N) linear complexity with sequence length; constant memory consumption during generation.",
      disadvantages: "Slightly weaker in-context retrieval and copy-pasting compared to full softmax attention.",
      useWhen: "Extreme context lengths (>1,000,000 tokens) and continuous real-time audio/sensor streaming.",
    },
  ],

  furtherReading: [
    {
      title: "Attention Is All You Need",
      type: "Paper",
      authorOrOrg: "Ashish Vaswani et al. (Google Brain / Google Research, NeurIPS 2017)",
      description: "The landmark publication introducing the Transformer and Scaled Dot-Product Attention.",
      url: "https://arxiv.org/abs/1706.03762",
    },
    {
      title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
      type: "Paper",
      authorOrOrg: "Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré (NeurIPS 2022)",
      description: "How GPU SRAM tiling and online softmax revolutionize attention scaling and memory efficiency.",
      url: "https://arxiv.org/abs/2205.14135",
    },
  ],
};
