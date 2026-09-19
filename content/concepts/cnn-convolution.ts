import { Concept } from "./types";

export const convolutionalNetworks: Concept = {
  slug: "convolutional-networks",
  title: "CNNs & Convolution",
  shortDescription:
    "Extract translation-invariant spatial features from multidimensional signals using sliding kernel convolutions, parameter sharing, and pooling.",
  category: "Deep Learning",
  track: "Deep Learning",
  difficulty: "Intermediate",
  estimatedTime: "~25 min",
  topics: [
    "2D Discrete Cross-Correlation / Convolution",
    "Sliding Kernels & Feature Maps",
    "Stride & Zero-Padding (Valid vs Same)",
    "Parameter Sharing & Translation Equivariance",
    "Receptive Field Expansion",
    "Spatial Downsampling & Max Pooling",
  ],

  overview: {
    problemStatement:
      "Passing high-resolution images (e.g. 1000×1000 RGB pixels = 3,000,000 inputs) into a standard dense fully connected layer with 1,000 hidden units requires 3 billion weight parameters for a single layer—guaranteeing catastrophic overfitting and GPU memory exhaustion. Furthermore, dense layers are not spatially invariant: a dog recognized in the top-left corner must be re-learned from scratch if it appears in the bottom-right corner.",
    whenToUse: [
      "Computer vision: object detection, semantic segmentation, image classification.",
      "Audio spectrogram processing: acoustic model feature extraction.",
      "Spatial grid telemetry: climate modeling, medical imaging (MRI/CT), and physics simulations.",
    ],
    whenNotToUse: [
      "Tabular business data where feature ordering is arbitrary (permuting columns breaks convolutional spatial locality).",
      "Sequential language modeling where long-range dependencies across thousands of tokens exceed local receptive fields (use Transformers).",
      "Graph-structured networks with non-Euclidean connectivity (use Graph Neural Networks).",
    ],
    coreInvariant:
      "A convolutional layer enforces two structural inductive biases: Local Connectivity (neurons only connect to local spatial patches) and Parameter Sharing (the identical kernel weights W are slid across all spatial coordinates), guaranteeing Translation Equivariance: f(shift(x)) = shift(f(x)).",
  },

  whyItExists: {
    realWorldProblem:
      "In medical CT imaging, an organ or tumor can appear anywhere within the scanned volume. A fully connected network requires independent sets of weights to recognize the same tumor at every possible (x, y) coordinate. A convolutional network slides the exact same feature detector across the entire scan, detecting the pattern regardless of spatial translation with a tiny fraction of the parameters.",
    catastrophicScenario:
      "A defect inspection camera on an automated semiconductor assembly line uses unpadded valid convolutions across 12 deep layers. With a 5×5 kernel and no padding, each layer shrinks the spatial grid by 4 pixels ((32-5)/1 + 1 = 28). By layer 8, the feature map shrinks to 0×0 pixels, causing tensor dimension crash exceptions during deployment. Even worse, the outer 16 pixels of the silicon wafer were never inspected because valid convolution discards image borders.",
    systemImpact: [
      "Spatial boundary degradation from unpadded valid convolutions.",
      "Receptive field blindness: shallow CNNs failing to grasp global scene context.",
      "Parameter explosion when flattening high-resolution feature maps into dense heads.",
      "Information loss from aggressive non-invertible spatial pooling.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "In deep learning, 2D convolution is mathematically implemented as discrete cross-correlation. For input image I and kernel K of size (k_h, k_w): S(i, j) = (I * K)(i, j) = ∑_m ∑_n I(i + m, j + n) K(m, n).",
      "At each coordinate (i, j), the kernel multiplies the local receptive field patch element-wise and sums the products into a single scalar in the output feature map.",
      "Spatial Dimensions Formula: For input dimension W, kernel size K, padding P, and stride S, the output spatial dimension is: W_out = ⌊(W - K + 2P) / S⌋ + 1.",
      "Receptive Field: As layers are stacked, a single pixel in a deep feature map corresponds to a progressively larger region of the original input image: RF_{l} = RF_{l-1} + (K_l - 1) · ∏_{i=1}^{l-1} S_i.",
    ],
    singleVsDistributed:
      "In production deep learning frameworks, 2D convolution is rarely computed with naive nested loops. Instead, it is lowered to General Matrix Multiply (GEMM) using the `im2col` algorithm: input image patches are rearranged into columns of a large matrix, allowing cuBLAS to execute the convolution as a single blazing-fast matrix product W · X_col.",
    semanticsAndGuarantees: [
      "Translation Equivariance: Shifting an image by Δ pixels shifts the output feature map by the corresponding Δ pixels.",
      "Parameter Efficiency: A 3×3 RGB kernel uses only 3 × 3 × 3 = 27 weights regardless of whether the image is 32×32 or 4K resolution.",
      "Pooling Invariance: Max Pooling (e.g. 2×2 with stride 2) retains the maximum activation in each window, providing local translation invariance and halving spatial memory.",
    ],
    keyAlgorithms: [
      {
        name: "Direct Spatial Convolution (im2col + GEMM)",
        description:
          "Unrolls spatial receptive fields into columns and computes convolution via standard BLAS matrix multiplication.",
        pros: "Leverages highly optimized hardware tensor cores; industry standard in cuDNN.",
        cons: "Requires temporary memory buffer to store unrolled im2col matrix.",
      },
      {
        name: "Winograd Convolution",
        description:
          "Applies minimal filtering algorithms to compute small convolutions (e.g. 3×3 kernels with stride 1) with up to 2.25x fewer multiplications.",
        pros: "Fastest algorithm for small kernels; significantly reduces arithmetic operations.",
        cons: "Introduces numerical precision issues at larger tile sizes.",
      },
      {
        name: "Depthwise Separable Convolution",
        description:
          "Decomposes standard convolution into a depthwise spatial convolution (per channel) followed by a 1×1 pointwise convolution (across channels).",
        pros: "Reduces computational FLOPs and parameter count by 8x-9x; powers MobileNet architectures.",
        cons: "Slightly lower peak FLOP utilization on GPU tensor cores compared to dense GEMM.",
      },
    ],
  },

  visualizerType: "convolutional-networks",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Apply Zero-Padding to Input Tensor",
      summary: "Surround input borders with zeros to control spatial reduction.",
      explanation:
        "For 'Same' padding that preserves spatial dimensions with stride 1, pad borders by P = (K - 1) // 2 on all sides.",
      pseudocode: `def pad2d(X, pad):\n  return np.pad(X, ((0, 0), (pad, pad), (pad, pad)), mode='constant')`,
      considerations: [
        "Reflection padding or replication padding avoids artificial zero-value border artifacts in image restoration.",
      ],
    },
    {
      stepNumber: 2,
      title: "Slide Kernel & Compute Local Dot Products",
      summary: "Multiply kernel weights element-wise with local receptive patch.",
      explanation:
        "Iterate over output grid (out_h, out_w). Extract patch X[i*stride : i*stride + k_h, j*stride : j*stride + k_w], compute element-wise product with kernel K, sum products, and add bias.",
      pseudocode: `for i in range(H_out):\n  for j in range(W_out):\n    patch = X[i*S:i*S+K, j*S:j*S+K]\n    out[i, j] = np.sum(patch * kernel) + bias`,
      considerations: [
        "In production, use im2col to avoid nested Python loops.",
      ],
    },
    {
      stepNumber: 3,
      title: "Apply Spatial Pooling (Max Pooling)",
      summary: "Downsample feature map by selecting maximum local activations.",
      explanation:
        "Divide feature map into non-overlapping 2×2 blocks (stride 2). Retain the maximum scalar value in each block: out[i, j] = max(X[2i:2i+2, 2j:2j+2]).",
      pseudocode: `def max_pool2d(X, pool_size=2):\n  H, W = X.shape\n  return X.reshape(H//2, 2, W//2, 2).max(axis=(1, 3))`,
      considerations: [
        "Max pooling provides translation invariance and halves height/width, reducing memory by 4x for subsequent layers.",
      ],
    },
  ],

  codeImplementations: {
    python: {
      filename: "cnn_convolution.py",
      code: `import numpy as np
from typing import Tuple

class Conv2D:
    """
    2D Convolutional Layer with Stride, Padding, and Receptive Field math.
    """
    def __init__(self, kernel: np.ndarray, stride: int = 1, padding: int = 0):
        self.kernel = np.asarray(kernel, dtype=np.float32)
        self.k_h, self.k_w = self.kernel.shape
        self.stride = stride
        self.padding = padding

    def forward(self, X: np.ndarray) -> np.ndarray:
        """
        Executes 2D convolution over single-channel input matrix X [H, W].
        Returns: Feature map [H_out, W_out].
        """
        X = np.asarray(X, dtype=np.float32)
        H, W = X.shape

        # 1. Apply zero padding
        if self.padding > 0:
            X_padded = np.pad(X, self.padding, mode="constant", constant_values=0)
        else:
            X_padded = X

        H_pad, W_pad = X_padded.shape

        # 2. Compute output spatial dimensions
        H_out = (H_pad - self.k_h) // self.stride + 1
        W_out = (W_pad - self.k_w) // self.stride + 1
        output = np.zeros((H_out, W_out), dtype=np.float32)

        # 3. Slide kernel across spatial coordinates
        for i in range(H_out):
            r_start = i * self.stride
            r_end = r_start + self.k_h
            for j in range(W_out):
                c_start = j * self.stride
                c_end = c_start + self.k_w

                receptive_patch = X_padded[r_start:r_end, c_start:c_end]
                output[i, j] = np.sum(receptive_patch * self.kernel)

        return output

class MaxPool2D:
    """2x2 Max Pooling with Stride 2."""
    def __init__(self, pool_size: int = 2):
        self.pool_size = pool_size

    def forward(self, X: np.ndarray) -> np.ndarray:
        H, W = X.shape
        H_out = H // self.pool_size
        W_out = W // self.pool_size
        output = np.zeros((H_out, W_out), dtype=np.float32)

        for i in range(H_out):
            for j in range(W_out):
                patch = X[i * self.pool_size:(i + 1) * self.pool_size,
                          j * self.pool_size:(j + 1) * self.pool_size]
                output[i, j] = np.max(patch)

        return output`,
      explanation:
        "Readable and mathematically explicit NumPy implementation of 2D cross-correlation and max pooling. Illustrates padding boundaries, sliding window indices, and dot-product accumulation.",
      keyDecisions: [
        "Implemented integer dimension calculation (H - K + 2P)//S + 1.",
        "Decoupled convolution from pooling for modular visual testing.",
      ],
      complexityNotes:
        "Time Complexity: O(H_out · W_out · K_h · K_w). Memory: O(H_out · W_out) for output feature map.",
    },

    typescript: {
      filename: "Convolution.ts",
      code: `export function convolve2D(
  input: number[][],
  kernel: number[][],
  stride: number = 1
): number[][] {
  const inH = input.length;
  const inW = input[0].length;
  const kH = kernel.length;
  const kW = kernel[0].length;

  const outH = Math.floor((inH - kH) / stride) + 1;
  const outW = Math.floor((inW - kW) / stride) + 1;

  const output: number[][] = Array.from({ length: outH }, () =>
    new Array(outW).fill(0)
  );

  for (let i = 0; i < outH; i++) {
    for (let j = 0; j < outW; j++) {
      let sum = 0;
      for (let m = 0; m < kH; m++) {
        for (let n = 0; n < kW; n++) {
          sum += input[i * stride + m][j * stride + n] * kernel[m][n];
        }
      }
      output[i][j] = sum;
    }
  }

  return output;
}`,
      explanation:
        "TypeScript implementation powering real-time client-side feature map generation and interactive kernel filtering.",
      keyDecisions: [
        "Valid padding implementation matching browser visualizer grid boundaries.",
      ],
      complexityNotes:
        "O(outH · outW · kH · kW) time.",
    },
  },

  edgeCases: [
    {
      scenario: "Border Erosion in Deep Unpadded Networks",
      consequence:
        "Without padding, every 3×3 convolution strips 2 pixels from each dimension. In a 10-layer network, 20 pixels are lost from height and width, clipping periphery objects.",
      solution:
        "Use 'Same' padding with P = (K - 1) // 2 to maintain constant spatial resolution across deep layers.",
    },
    {
      scenario: "Receptive Field Too Small for Global Context",
      consequence:
        "A shallow CNN classifies a medical image based on local texture rather than whole-organ geometry because its receptive field only covers 15×15 pixels of a 512×512 image.",
      solution:
        "Increase depth, introduce Dilated (Atrous) Convolutions, or append a Vision Transformer (ViT) self-attention layer for global context.",
    },
    {
      scenario: "Odd vs Even Kernel Sizes",
      consequence:
        "Even kernel sizes (e.g. 4×4) cannot be symmetrically padded around a center pixel, introducing directional phase drift across deep layers.",
      solution:
        "Always use odd-sized kernels (3×3, 5×5, 7×7) so padding is perfectly symmetric: P = (K - 1) / 2.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Imbalance between Spatial Resolution and Channel Depth",
        description:
          "Halving spatial resolution while quadrupling channel depth too rapidly causes memory bottlenecks and GPU register spilling.",
        mitigation:
          "Follow standard architecture conventions (e.g. ResNet): double channels (C → 2C) when halving spatial dimensions (H → H/2).",
      },
      {
        title: "Adversarial Patch Susceptibility",
        description:
          "Because CNNs rely heavily on local texture cues, small sticker patches placed on road signs can fool autonomous vehicle classifiers into misreading stop signs.",
        mitigation:
          "Train with adversarial data augmentation and combine CNN backbones with Transformer global self-attention heads.",
      },
    ],
    scaling10x: [
      "Use TensorRT / cuDNN FP16 fused Conv-BatchNorm-ReLU layers to double inference throughput on edge devices (NVIDIA Jetson).",
      "Deploy MobileNetV3 / EfficientNet architectures with Depthwise Separable convolutions for mobile battery efficiency.",
    ],
    concurrencyRaceConditions: [
      "Convolutional inference operations are pure read-only tensor mappings; entirely thread-safe across concurrent serving worker threads.",
    ],
    observability: {
      metrics: [
        "conv_layer_receptive_field_pixels{layer} (gauge)",
        "conv_feature_map_sparsity_ratio (gauge)",
        "conv_kernel_execution_ms (histogram)",
      ],
      logs: [
        "Log warning if spatial dimension collapses below 1×1 before reaching global average pooling.",
      ],
      traces: [
        "OpenTelemetry span for 'conv2d.gemm' measuring tensor execution duration.",
      ],
    },
    securityNotes: [
      "Adversarial Universal Perturbations: High-frequency noise patterns imperceptible to humans can be crafted to force CNNs to misclassify any image into a target class.",
    ],
  },

  tradeoffs: [
    {
      approach: "Standard 2D Convolution",
      advantages: "Strong spatial inductive bias; translation equivariance; excellent feature extraction.",
      disadvantages: "Fixed local receptive field; requires deep stacking to observe global context.",
      useWhen: "Standard image classification, object detection, and localized pattern recognition.",
    },
    {
      approach: "Dilated (Atrous) Convolution",
      advantages: "Expands receptive field exponentially without increasing parameter count or losing spatial resolution.",
      disadvantages: "Prone to 'gridding artifacts' if dilation rates share common factors.",
      useWhen: "Semantic segmentation and real-time audio generation (WaveNet).",
    },
    {
      approach: "Vision Transformers (ViT / Self-Attention)",
      advantages: "Global receptive field from Layer 1; scales exceptionally well with massive datasets.",
      disadvantages: "Requires 10x more pre-training data to learn spatial biases; quadratic O(N²) attention cost.",
      useWhen: "Foundation models pre-trained on hundreds of millions of images (CLIP, DINOv2).",
    },
  ],

  furtherReading: [
    {
      title: "Gradient-Based Learning Applied to Document Recognition (LeNet-5)",
      type: "Paper",
      authorOrOrg: "Yann LeCun, Léon Bottou, Yoshua Bengio, Patrick Haffner (IEEE 1998)",
      description: "The foundational paper establishing modern convolutional neural networks and weight sharing.",
      url: "http://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf",
    },
    {
      title: "Deep Residual Learning for Image Recognition (ResNet)",
      type: "Paper",
      authorOrOrg: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun (CVPR 2016)",
      description: "How identity shortcut connections solved the vanishing gradient problem, allowing CNNs to scale to 152 layers.",
      url: "https://arxiv.org/abs/1512.03385",
    },
  ],
};
