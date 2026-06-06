import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(dto: { userId: string; prompt: string; slideId: string | null; modelName: string }) {
    const { prompt, slideId, modelName } = dto;

    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const lowercasePrompt = prompt.toLowerCase();
    let responseText = '';

    if (slideId === '4' || lowercasePrompt.includes('backprop') || lowercasePrompt.includes('chain rule') || lowercasePrompt.includes('gradient')) {
      responseText = `### Slide 4 Context: Gradient Descent & Backpropagation\n\nTo compute the local gradients for neural network training, we utilize the **Chain Rule of Calculus**.\n\nLet $z = wx + b$ and $a = \\sigma(z)$. The loss derivative with respect to weight $w$ is calculated as:\n$$\\frac{\\partial L}{\\partial w} = \\frac{\\partial L}{\\partial a} \\cdot \\frac{\\partial a}{\\partial z} \\cdot \\frac{\\partial z}{\\partial w}$$\n\nWhere:\n1. $\\frac{\\partial z}{\\partial w} = x$\n2. $\\frac{\\partial a}{\\partial z} = \\sigma'(z)$\n\nTherefore, we propagate the error gradient backward through the graph: $\\delta = \\frac{\\partial L}{\\partial z} = \\frac{\\partial L}{\\partial a} \\cdot \\sigma'(z)$.\n\nWould you like me to write a PyTorch snippet demonstrating this manual backward pass?`;
    } else if (slideId === '3' || lowercasePrompt.includes('neural network') || lowercasePrompt.includes('relu') || lowercasePrompt.includes('activation')) {
      responseText = `### Slide 3 Context: Deep Neural Networks Foundations\n\nDeep neural networks consist of nested linear mappings followed by element-wise non-linear activation functions:\n$$f(x) = \\sigma(W_L \\sigma(... \\sigma(W_1 x + b_1)...) + b_L)$$\n\n**Common Activation Functions**:\n*   **ReLU (Rectified Linear Unit)**: $\\text{ReLU}(x) = \\max(0, x)$. It resolves the vanishing gradient problem in deep architectures but can suffer from "dying ReLU" if weights update such that neurons never activate.\n*   **Sigmoid**: $\\sigma(x) = \\frac{1}{1 + e^{-x}}$. Maps values to $(0, 1)$, useful for binary classification output layers.`;
    } else if (slideId === '2' || lowercasePrompt.includes('supervised') || lowercasePrompt.includes('unsupervised') || lowercasePrompt.includes('learning')) {
      responseText = `### Slide 2 Context: Supervised vs Unsupervised Learning\n\n*   **Supervised Learning**: Learn mapping $f: X \\to Y$ from labeled dataset $\\mathcal{D} = \\{(x_i, y_i)\\}_{i=1}^N$. Used for classification (discrete $Y$) and regression (continuous $Y$).\n*   **Unsupervised Learning**: Learn structure/density of input space $X$ from unlabeled dataset $\\mathcal{D} = \\{x_i\\}_{i=1}^N$. Used for clustering (K-Means, GMM), dimensionality reduction (PCA, t-SNE), and density estimation.`;
    } else {
      responseText = `### FASCA Core Intelligence Response (${modelName})\n\nI have parsed your request within the active study room. Here is the response:\n\nRegarding your query about **"${prompt}"**:\n\nIn machine learning, this typically refers to optimizing parameter search space coordinates. If this is linked to the current course, I recommend referencing the mathematical foundations on standard derivatives and loss metrics. Let me know if you want me to expand on any specific sub-topic.`;
    }

    return {
      text: responseText,
      model: modelName,
    };
  }
}
