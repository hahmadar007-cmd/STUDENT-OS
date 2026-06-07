import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_GEMINI_KEY = process.env.DEFAULT_GEMINI_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.DEFAULT_OPENAI_KEY || '';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(
    dto: { userId: string; prompt: string; slideId: string | null; modelName: string },
    headers: Record<string, string> = {},
  ) {
    const { prompt, slideId, modelName } = dto;
    const lowercasePrompt = prompt.toLowerCase();

    // 1. Resolve keys and endpoints from headers or environment
    const geminiKey = headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const openaiKey = headers['x-openai-key'] || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY;
    const anthropicKey = headers['x-anthropic-key'] || process.env.ANTHROPIC_API_KEY;
    const customUrl = headers['x-custom-url'];
    const customKey = headers['x-custom-key'];

    // 2. Try real API calls depending on selected model
    // Google Gemini
    if (modelName === 'gemini-1.5-pro' && geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are Fasca AI, a helpful study assistant. Context slide: ${slideId || 'none'}. Prompt: ${prompt}` }] }],
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, model: 'Gemini 1.5 Pro' };
        } else {
          const data = await response.json().catch(() => ({}));
          console.error('Gemini API Error response:', data);
          if (data.error?.status === 'RESOURCE_EXHAUSTED' || data.error?.code === 429) {
            return {
              text: `### FASCA Core Intelligence Error\n\nThe Google Gemini API rate limit or quota has been exceeded.\n\nMessage: ${data.error?.message || 'Quota exceeded'}.\n\nPlease try again shortly, check your billing details, or link a personal key in settings.`,
              model: 'Gemini (Quota Exceeded)',
            };
          }
          if (data.error?.code === 400 || data.error?.code === 403) {
            return {
              text: `### FASCA Core Intelligence Error\n\nFailed to authenticate with Gemini API (error: ${data.error?.message || 'Invalid API key'}).\n\nPlease check your linked Gemini connection token in your settings page.`,
              model: 'Gemini (Auth Error)',
            };
          }
        }
      } catch (err) {
        console.error('Gemini API Error:', err);
      }
    }

    // OpenAI GPT-4o
    if (modelName === 'gpt-4o' && openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: `You are Fasca AI, a helpful study assistant. Context slide: ${slideId || 'none'}. Prompt: ${prompt}` }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: 'GPT-4o' };
        } else {
          const data = await response.json().catch(() => ({}));
          console.error('OpenAI API Error response:', data);
          if (data.error?.code === 'insufficient_quota' || response.status === 429) {
            return {
              text: `### FASCA Core Intelligence Error\n\nThe connected OpenAI account has exceeded its API quota (error: insufficient_quota).\n\nPlease update your API key in settings, check your billing status, or switch your connection mode to Google Gemini (System Default).`,
              model: 'GPT-4o (Error)',
            };
          }
        }
      } catch (err) {
        console.error('OpenAI API Error:', err);
      }
    }

    // Anthropic Claude
    if (modelName === 'claude-3-5-sonnet' && anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: `You are Fasca AI, a helpful study assistant. Context slide: ${slideId || 'none'}. Prompt: ${prompt}` }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) return { text, model: 'Claude 3.5 Sonnet' };
        } else {
          const data = await response.json().catch(() => ({}));
          console.error('Anthropic API Error response:', data);
        }
      } catch (err) {
        console.error('Anthropic API Error:', err);
      }
    }

    // Custom Endpoint
    if (modelName === 'custom-endpoint' && customUrl) {
      try {
        const fetchUrl = customUrl.endsWith('chat/completions') ? customUrl : `${customUrl}/chat/completions`;
        const headersObj: Record<string, string> = { 'Content-Type': 'application/json' };
        if (customKey) headersObj['Authorization'] = `Bearer ${customKey}`;

        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: headersObj,
          body: JSON.stringify({
            model: 'custom',
            messages: [{ role: 'user', content: `You are Fasca AI, a helpful study assistant. Context slide: ${slideId || 'none'}. Prompt: ${prompt}` }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: 'Custom Endpoint' };
        }
      } catch (err) {
        console.error('Custom Endpoint Error:', err);
      }
    }

    // 3. Fallback to existing mock simulations
    await new Promise((resolve) => setTimeout(resolve, 800));

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
      model: `${modelName} (Simulated)`,
    };
  }
}
