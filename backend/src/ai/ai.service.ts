import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector.service';
import { YoutubeService } from './youtube.service';
import {
  extractApiKeys,
  formatProviderError,
  primaryApiKey,
  resolveModel,
} from './ai-models';

// ── BYOK ONLY — no default/fallback keys ──────────────────────────────────────
// All keys must come from request headers sent by the authenticated frontend.
// ─────────────────────────────────────────────────────────────────────────────

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
    providerType?: string,
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

    // Priority 3: Vector search on course materials (Gemini embeddings only)
    if (courseId && prompt && providerType === 'GEMINI' && apiKey) {
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
    const { prompt, slideId, modelName } = dto;
    const keys = extractApiKeys(headers);
    const { providerType } = keys;

    const activeApiKey = primaryApiKey(keys);
    const fullPrompt = await this.buildContextPrompt(dto, activeApiKey, keys.providerType);

    // ── No engine configured ───────────────────────────────────────────────────
    if (!providerType) {
      return {
        text: `### No AI Engine Configured\n\nTo use Fasca AI, please:\n1. Open **AI Engines** in the settings panel\n2. Click **Add AI Engine**\n3. Enter your API key and select a **Provider Type** (Gemini, OpenAI, Anthropic, etc.)\n4. Click the engine card to activate it\n\nYour key is stored only in your browser and is never shared.`,
        model: 'System',
      };
    }

    // ── GEMINI ────────────────────────────────────────────────────────────────
    if (providerType === 'GEMINI') {
      const geminiKey = keys.geminiKey;
      if (!geminiKey) {
        return {
          text: `### Gemini Key Missing\n\nYou have selected GEMINI as your provider but no API key was found.\n\nPlease add and activate a Gemini engine in **AI Engines** settings.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('GEMINI', modelName);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${geminiKey}`,
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
          if (text) return { text, model: actualModel };
          return { text: '### Gemini returned an empty response. Please try again.', model: actualModel };
        }
        const data = await response.json().catch(() => ({}));
        return {
          text: formatProviderError('Gemini', response.status, data.error?.message || 'Unknown error'),
          model: `Gemini (Error ${response.status})`,
        };
      } catch (err: any) {
        return {
          text: `### Gemini Network Error\n\nFailed to reach the Gemini API.\n\nError: ${err.message || err}`,
          model: 'Gemini (Network Error)',
        };
      }
    }

    // ── OPENAI ────────────────────────────────────────────────────────────────
    if (providerType === 'OPENAI') {
      const openaiKey = keys.openaiKey;
      if (!openaiKey) {
        return {
          text: `### OpenAI Key Missing\n\nYou have selected OPENAI as your provider but no API key was found.\n\nPlease add and activate an OpenAI engine in **AI Engines** settings.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('OPENAI', modelName);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: actualModel };
          return { text: '### OpenAI returned an empty response. Please try again.', model: actualModel };
        }
        const data = await response.json().catch(() => ({}));
        return {
          text: formatProviderError('OpenAI', response.status, data.error?.message || 'Unknown error'),
          model: `OpenAI (Error ${response.status})`,
        };
      } catch (err: any) {
        return {
          text: `### OpenAI Network Error\n\nFailed to reach the OpenAI API.\n\nError: ${err.message || err}`,
          model: 'OpenAI (Network Error)',
        };
      }
    }

    // ── ANTHROPIC ─────────────────────────────────────────────────────────────
    if (providerType === 'ANTHROPIC') {
      const anthropicKey = keys.anthropicKey;
      if (!anthropicKey) {
        return {
          text: `### Anthropic Key Missing\n\nYou have selected ANTHROPIC as your provider but no API key was found.\n\nPlease add and activate an Anthropic engine in **AI Engines** settings.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('ANTHROPIC', modelName);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: actualModel,
            max_tokens: 2048,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) return { text, model: actualModel };
          return { text: '### Anthropic returned an empty response. Please try again.', model: actualModel };
        }
        const data = await response.json().catch(() => ({}));
        return {
          text: formatProviderError('Anthropic', response.status, data.error?.message || 'Unknown error'),
          model: `Anthropic (Error ${response.status})`,
        };
      } catch (err: any) {
        return {
          text: `### Anthropic Network Error\n\nFailed to reach the Anthropic API.\n\nError: ${err.message || err}`,
          model: 'Anthropic (Network Error)',
        };
      }
    }

    // ── DEEPSEEK ──────────────────────────────────────────────────────────────
    if (providerType === 'DEEPSEEK') {
      const deepseekKey = keys.deepseekKey;
      if (!deepseekKey) {
        return {
          text: `### DeepSeek Key Missing\n\nYou have selected DEEPSEEK as your provider but no API key was found.\n\nPlease add and activate a DeepSeek engine in **AI Engines** settings.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('DEEPSEEK', modelName);
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: actualModel };
          return { text: '### DeepSeek returned an empty response. Please try again.', model: actualModel };
        }
        const data = await response.json().catch(() => ({}));
        return {
          text: formatProviderError('DeepSeek', response.status, data.error?.message || 'Unknown error'),
          model: `DeepSeek (Error ${response.status})`,
        };
      } catch (err: any) {
        return {
          text: `### DeepSeek Network Error\n\nFailed to reach the DeepSeek API.\n\nError: ${err.message || err}`,
          model: 'DeepSeek (Network Error)',
        };
      }
    }

    // ── OPENROUTER ────────────────────────────────────────────────────────────
    if (providerType === 'OPENROUTER') {
      const openrouterKey = keys.openrouterKey;
      if (!openrouterKey) {
        return {
          text: `### OpenRouter Key Missing\n\nYou have selected OPENROUTER as your provider but no API key was found.\n\nPlease add and activate an OpenRouter engine in **AI Engines** settings.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('OPENROUTER', modelName);
        const baseUrl = keys.customUrl || 'https://openrouter.ai/api/v1';
        const endpoint = baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://fasca.app',
            'X-Title': 'Fasca AI',
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: actualModel };
          return { text: '### OpenRouter returned an empty response. Please try again.', model: actualModel };
        }
        const data = await response.json().catch(() => ({}));
        return {
          text: formatProviderError('OpenRouter', response.status, data.error?.message || JSON.stringify(data)),
          model: `OpenRouter (Error ${response.status})`,
        };
      } catch (err: any) {
        return {
          text: `### OpenRouter Network Error\n\nFailed to reach the endpoint.\n\nError: ${err.message || err}`,
          model: 'OpenRouter (Network Error)',
        };
      }
    }

    // ── CUSTOM (Ollama / local / other OpenAI-compatible) ─────────────────────
    if (providerType === 'CUSTOM') {
      const customUrl = keys.customUrl;
      const customKey = keys.customKey;
      if (!customUrl || !customKey) {
        return {
          text: `### Custom Engine Misconfigured\n\nYou have selected CUSTOM as your provider but the **Base URL** and/or **API Key** are missing.\n\nPlease edit your engine in **AI Engines** settings and ensure both are set.`,
          model: 'System',
        };
      }
      try {
        const actualModel = resolveModel('CUSTOM', modelName);
        const fetchUrl = customUrl.endsWith('chat/completions')
          ? customUrl
          : `${customUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customKey}`,
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, model: actualModel };
          return { text: '### Custom endpoint returned an empty response.', model: actualModel };
        }
        return {
          text: formatProviderError('Custom', response.status, `Endpoint returned status ${response.status}`),
          model: 'Custom (Error)',
        };
      } catch (err: any) {
        return {
          text: `### Custom Endpoint Network Error\n\nFailed to reach: ${customUrl}\n\nError: ${err.message || err}`,
          model: 'Custom (Network Error)',
        };
      }
    }

    // ── Unknown provider type ──────────────────────────────────────────────────
    return {
      text: `### Unknown Provider Type\n\nReceived an unrecognised provider type: \`${providerType}\`.\n\nSupported types: GEMINI, OPENAI, ANTHROPIC, DEEPSEEK, OPENROUTER, CUSTOM.\n\nPlease re-configure your engine in **AI Engines** settings.`,
      model: 'System',
    };
  }

  async validateKey(
    providerType: string,
    headers: Record<string, string>,
    modelName?: string,
    baseUrl?: string,
  ): Promise<{ ok: boolean; message: string }> {
    const keys = extractApiKeys(headers);
    const pType = (providerType || keys.providerType || '').toUpperCase();
    const testModel = resolveModel(pType, modelName);
    const customUrl = baseUrl || keys.customUrl || '';

    try {
      if (pType === 'GEMINI') {
        if (!keys.geminiKey) return { ok: false, message: 'No Gemini API key provided.' };
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${keys.geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
          },
        );
        if (res.ok) return { ok: true, message: `Gemini connected · ${testModel} ✓` };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: formatProviderError('Gemini', res.status, data.error?.message || 'Invalid API key.') };
      }

      if (pType === 'OPENAI') {
        if (!keys.openaiKey) return { ok: false, message: 'No OpenAI API key provided.' };
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${keys.openaiKey}` },
        });
        if (res.ok) return { ok: true, message: `OpenAI connected · ${testModel} ✓` };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: formatProviderError('OpenAI', res.status, data.error?.message || 'Invalid API key.') };
      }

      if (pType === 'ANTHROPIC') {
        if (!keys.anthropicKey) return { ok: false, message: 'No Anthropic API key provided.' };
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': keys.anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: testModel,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (res.ok || res.status === 529) return { ok: true, message: `Anthropic connected · ${testModel} ✓` };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: formatProviderError('Anthropic', res.status, data.error?.message || 'Invalid API key.') };
      }

      if (pType === 'DEEPSEEK') {
        if (!keys.deepseekKey) return { ok: false, message: 'No DeepSeek API key provided.' };
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { 'Authorization': `Bearer ${keys.deepseekKey}` },
        });
        if (res.ok) return { ok: true, message: `DeepSeek connected · ${testModel} ✓` };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: formatProviderError('DeepSeek', res.status, data.error?.message || 'Invalid API key.') };
      }

      if (pType === 'OPENROUTER') {
        if (!keys.openrouterKey) return { ok: false, message: 'No OpenRouter API key provided.' };
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${keys.openrouterKey}` },
        });
        if (res.ok) return { ok: true, message: `OpenRouter connected · ${testModel} ✓` };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: formatProviderError('OpenRouter', res.status, data.error?.message || 'Invalid API key.') };
      }

      if (pType === 'CUSTOM') {
        if (!keys.customKey) return { ok: false, message: 'No custom API key provided.' };
        if (!customUrl) return { ok: false, message: 'No Base URL provided for custom endpoint.' };
        const testUrl = customUrl.replace(/\/$/, '').replace(/\/chat\/completions$/, '') + '/models';
        const res = await fetch(testUrl, {
          headers: { 'Authorization': `Bearer ${keys.customKey}` },
        });
        if (res.ok) return { ok: true, message: `Custom endpoint reachable · ${testModel} ✓` };
        return { ok: false, message: `Custom endpoint returned ${res.status}. Check your Base URL and key.` };
      }

      return { ok: false, message: `Unknown provider type: ${pType}. Use GEMINI, OPENAI, ANTHROPIC, DEEPSEEK, OPENROUTER, or CUSTOM.` };
    } catch (err: any) {
      return { ok: false, message: `Network error while validating: ${err.message || err}` };
    }
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
