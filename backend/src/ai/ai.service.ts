import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector.service';
import { YoutubeService } from './youtube.service';

const DEFAULT_GEMINI_KEY = process.env.DEFAULT_GEMINI_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.DEFAULT_OPENAI_KEY || '';
const DEFAULT_DEEPSEEK_KEY = process.env.DEFAULT_DEEPSEEK_KEY || '';

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

    const geminiKey = headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const openaiKey = headers['x-openai-key'] || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY;
    const deepseekKey = headers['x-deepseek-key'] || process.env.DEEPSEEK_API_KEY || DEFAULT_DEEPSEEK_KEY;
    const anthropicKey = headers['x-anthropic-key'] || process.env.ANTHROPIC_API_KEY;
    const customUrl = headers['x-custom-url'];
    const customKey = headers['x-custom-key'];
    const openrouterKey = headers['x-openrouter-key'];

    const activeApiKey = geminiKey || openaiKey || deepseekKey || anthropicKey || openrouterKey || '';
    const fullPrompt = await this.buildContextPrompt(dto, activeApiKey);

    // OpenRouter — fires when user has configured a personal engine key
    // Model name is passed as-is so users can specify any OpenRouter model
    if (openrouterKey) {
      const baseUrl = customUrl || 'https://openrouter.ai/api/v1';
      const endpoint = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://fasca.app',
            'X-Title': 'Fasca AI',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: modelName };
        } else {
          const data = await response.json().catch(() => ({}));
          return {
            text: `### Fasca AI Error\n\nAPI returned status ${response.status}.\n\n**Message:** ${data.error?.message || JSON.stringify(data)}\n\nCheck your API key and model name in AI Engines settings.`,
            model: `${modelName} (Error ${response.status})`,
          };
        }
      } catch (err: any) {
        return {
          text: `### Fasca AI Error\n\nFailed to reach the AI endpoint.\n\n**Error:** ${err.message || err}\n\nCheck your Base URL and API key in AI Engines settings.`,
          model: `${modelName} (Network Error)`,
        };
      }
    }

    if (modelName.startsWith('gemini') && geminiKey) {
      try {
        const actualModel = modelName === 'gemini' ? 'gemini-1.5-pro' : modelName;
        const callGemini = async (model: string) => {
          return await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
              }),
            },
          );
        };

        const response = await callGemini(actualModel);
        let activeModel = actualModel === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash' : 'Gemini 1.5 Pro';

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, model: activeModel };
        } else {
          const data = await response.json().catch(() => ({}));
          if (response.status === 404) {
            return {
              text: `### Gemini Model Unavailable\n\nThe selected model \`${actualModel}\` was not found. Please check if this model is supported in your region or update your API key permissions.`,
              model: `Gemini (Error 404)`,
            };
          }
          return {
            text: `### Gemini API Error\n\nThe Google Gemini API returned an error.\n\nStatus: ${response.status}\nMessage: ${data.error?.message || 'Unknown error'}\n\nPlease try again shortly, check your billing details, or link a personal key in settings.`,
            model: `Gemini (API Error ${response.status})`,
          };
        }
      } catch (err: any) {
        return {
          text: `### Gemini API Error\n\nFailed to communicate with the Google Gemini API.\n\nError: ${err.message || err}\n\nPlease verify your internet connection or check your API key in settings.`,
          model: 'Gemini (Network Error)',
        };
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
          return {
            text: `### OpenAI API Error\n\nThe OpenAI API returned an error.\n\nStatus: ${response.status}\nMessage: ${data.error?.message || 'Unknown error'}\n\nPlease check your billing details, link a personal key in settings, or switch connection mode.`,
            model: `GPT-4o (API Error ${response.status})`,
          };
        }
      } catch (err: any) {
        return {
          text: `### OpenAI API Error\n\nFailed to communicate with the OpenAI API.\n\nError: ${err.message || err}\n\nPlease check your internet connection or key status.`,
          model: 'GPT-4o (Network Error)',
        };
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
          return {
            text: `### Anthropic API Error\n\nThe Anthropic API returned an error.\n\nStatus: ${response.status}\nMessage: ${data.error?.message || 'Unknown error'}`,
            model: `Claude (API Error ${response.status})`,
          };
        }
      } catch (err: any) {
        return {
          text: `### Anthropic API Error\n\nFailed to communicate with the Anthropic API.\n\nError: ${err.message || err}`,
          model: 'Claude (Network Error)',
        };
      }
    }

    // DeepSeek (OpenAI-compatible API)
    if (modelName === 'deepseek' && deepseekKey) {
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: 'DeepSeek' };
        } else {
          const data = await response.json().catch(() => ({}));
          return {
            text: `### DeepSeek API Error\n\nThe DeepSeek API returned an error.\n\nStatus: ${response.status}\nMessage: ${data.error?.message || 'Unknown error'}\n\nPlease try again or switch to another model.`,
            model: `DeepSeek (API Error ${response.status})`,
          };
        }
      } catch (err: any) {
        return {
          text: `### DeepSeek API Error\n\nFailed to communicate with the DeepSeek API.\n\nError: ${err.message || err}`,
          model: 'DeepSeek (Network Error)',
        };
      }
    }

    // Custom / local endpoint (OpenAI-compatible)
    if (customUrl && customKey) {
      try {
        const fetchUrl = customUrl.endsWith('chat/completions') ? customUrl : `${customUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: modelName };
        } else {
          return {
            text: `### FASCA Core Intelligence Error\n\nThe custom endpoint returned status ${response.status}.`,
            model: 'Custom Endpoint (Error)',
          };
        }
      } catch (err: any) {
        return {
          text: `### FASCA Core Intelligence Error\n\nFailed to contact custom endpoint: ${err.message || err}`,
          model: 'Custom Endpoint (Error)',
        };
      }
    }

    return {
      text: `### Configuration Error\n\nThe requested model \`${modelName}\` is missing its required API key or is unsupported. Please check your AI Engines settings or environment variables.`,
      model: 'System',
    };
  }

  async search(query: string) {
    if (!query || !query.trim()) {
      return [];
    }

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      const results = [];
      const blocks = html.split('<div class="result results_links results_links_deep web-result');

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const linkMatch = block.match(/class="result__a"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

        if (linkMatch && snippetMatch) {
          let title = linkMatch[2].replace(/<[^>]*>/g, '').trim();
          let link = linkMatch[1];
          let snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim();

          title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          snippet = snippet.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

          if (link.includes('uddg=')) {
            const matchUddg = link.match(/uddg=([^&]+)/);
            if (matchUddg) {
              link = decodeURIComponent(matchUddg[1]);
            }
          }

          results.push({ title, link, snippet });
        }
      }

      return results.slice(0, 8);
    } catch (err) {
      console.error('Search scraping failed:', err);
      return [];
    }
  }
}
