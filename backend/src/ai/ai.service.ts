import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector.service';
import { YoutubeService } from './youtube.service';

const DEFAULT_GEMINI_KEY = process.env.DEFAULT_GEMINI_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.DEFAULT_OPENAI_KEY || '';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
    private readonly youtubeService: YoutubeService,
  ) {}

  async buildContextPrompt(
    dto: {
      prompt: string;
      slideId: string | null;
      currentSlideText?: string;
      videoUrl?: string;
      videoTimestamp?: number;
      courseId?: string;
    },
    apiKey: string,
  ): Promise<string> {
    const { prompt, slideId, currentSlideText, videoUrl, videoTimestamp, courseId } = dto;
    let contextParts: string[] = [];

    // Priority 1: Current Slide
    if (currentSlideText && currentSlideText.trim()) {
      contextParts.push(`---
[CURRENT ACTIVE SLIDE CONTEXT]
Slide/Page Number: ${slideId || 'Unknown'}
Content:
${currentSlideText.trim()}`);
    }

    // Priority 2: Video Transcript Snippet
    if (videoUrl) {
      try {
        const timestamp = videoTimestamp || 0;
        const snippet = await this.youtubeService.getTranscriptSnippet(videoUrl, timestamp);
        if (snippet && snippet.trim()) {
          contextParts.push(`---
[ACTIVE VIDEO TRANSCRIPT (around timestamp ${timestamp} seconds)]
${snippet.trim()}`);
        }
      } catch (err) {
        console.error('Failed to get transcript snippet for prompt:', err);
      }
    }

    // Priority 3: Vector search on course materials
    if (courseId && prompt) {
      try {
        const searchResults = await this.vectorService.search(courseId, prompt, apiKey, 3);
        if (searchResults && searchResults.length > 0) {
          const formatted = searchResults
            .map((r, idx) => `Snippet #${idx + 1} (Page ${r.pageNum}, Doc: ${r.documentId}):\n${r.text}`)
            .join('\n\n');
          contextParts.push(`---
[RELEVANT COURSE REFERENCE MATERIALS]
${formatted}`);
        }
      } catch (err) {
        console.error('Vector search failed during prompt context generation:', err);
      }
    }

    const contextBlock = contextParts.length > 0
      ? `Here is the current study environment context:\n\n${contextParts.join('\n\n')}\n\n`
      : '';

    return `You are Fasca AI, a highly engaging, helpful, and premium AI Study Assistant.
Your goal is to help the student master their course material.

${contextBlock}Important Guidelines:
1. ALWAYS use the provided context (current slide text, video transcript, or relevant reference snippets) to answer the student's question directly.
2. NEVER say "I cannot see the slide" or "I cannot view the video" if context is provided.
3. If the user asks a question and context is present, assume they are referencing the context.
4. Keep the explanation clear, educational, and formatting clean with Markdown.

Student's Query: "${prompt}"`;
  }

  async chat(
    dto: {
      userId: string;
      prompt: string;
      slideId: string | null;
      modelName: string;
      currentSlideText?: string;
      videoUrl?: string;
      videoTimestamp?: number;
      courseId?: string;
    },
    headers: Record<string, string> = {},
  ) {
    const { prompt, slideId, modelName, currentSlideText } = dto;
    const lowercasePrompt = prompt.toLowerCase();

    // 1. Resolve keys and endpoints from headers or environment
    const geminiKey = headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const openaiKey = headers['x-openai-key'] || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY;
    const anthropicKey = headers['x-anthropic-key'] || process.env.ANTHROPIC_API_KEY;
    const customUrl = headers['x-custom-url'];
    const customKey = headers['x-custom-key'];

    const activeApiKey = geminiKey || openaiKey || '';
    const fullPrompt = await this.buildContextPrompt(dto, activeApiKey);

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
              contents: [{ parts: [{ text: fullPrompt }] }],
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
            messages: [{ role: 'user', content: fullPrompt }],
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
            messages: [{ role: 'user', content: fullPrompt }],
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
            messages: [{ role: 'user', content: fullPrompt }],
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

    // 3. Fallback to existing mock simulations but with live context
    await new Promise((resolve) => setTimeout(resolve, 800));

    let responseText = '';
    
    // Check if we have active slide text to answer from
    if (currentSlideText && currentSlideText.trim()) {
      responseText = `### FASCA Core Intelligence (Context Simulation)
I parsed the active **Slide ${slideId || 'unknown'}** text content:
"${currentSlideText.substring(0, 150)}..."

Regarding your query **"${prompt}"**:
Based on this slide's contents, this concept focuses on optimization and structuring learning parameters. Let me know if you would like me to summarize the slide further or write corresponding practice exercises.`;
    } else if (slideId === '4' || lowercasePrompt.includes('backprop') || lowercasePrompt.includes('chain rule') || lowercasePrompt.includes('gradient')) {
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
