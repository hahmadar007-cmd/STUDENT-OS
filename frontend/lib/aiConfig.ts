'use client';

/** Central AI configuration — single source of truth for all providers. */

export type ProviderType =
  | 'GEMINI'
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'DEEPSEEK'
  | 'OPENROUTER'
  | 'CUSTOM';

export const AI_PROVIDERS_STORAGE_KEY = 'fasca_ai_providers_v1';

export interface AiProviderConfig {
  id: string;
  name: string;
  apiKeyRaw: string;
  baseUrl: string | null;
  providerType: ProviderType;
  /** API model ID sent to the provider (e.g. gemini-2.0-flash) */
  modelId: string;
  isActive: boolean;
  createdAt: string;
  colorIndex: number;
}

export interface ProviderMeta {
  label: string;
  color: string;
  glow: string;
  defaultModel: string;
  models: { id: string; label: string; tier: 'free' | 'pro' }[];
  keyPlaceholder: string;
  keyHint: string;
  needsBaseUrl?: boolean;
}

export const PROVIDER_META: Record<ProviderType, ProviderMeta> = {
  GEMINI: {
    label: 'Google Gemini',
    color: '#4285f4',
    glow: 'rgba(66,133,244,0.35)',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)', tier: 'free' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tier: 'free' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'pro' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tier: 'pro' },
    ],
    keyPlaceholder: 'AIza...',
    keyHint: 'Get a free key at aistudio.google.com',
  },
  OPENAI: {
    label: 'OpenAI',
    color: '#10a37f',
    glow: 'rgba(16,163,127,0.35)',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)', tier: 'free' },
      { id: 'gpt-4o', label: 'GPT-4o', tier: 'pro' },
      { id: 'o3-mini', label: 'o3-mini', tier: 'pro' },
    ],
    keyPlaceholder: 'sk-...',
    keyHint: 'Get a key at platform.openai.com',
  },
  ANTHROPIC: {
    label: 'Anthropic Claude',
    color: '#d97757',
    glow: 'rgba(217,119,87,0.35)',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Recommended)', tier: 'free' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tier: 'pro' },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', tier: 'pro' },
    ],
    keyPlaceholder: 'sk-ant-...',
    keyHint: 'Get a key at console.anthropic.com',
  },
  DEEPSEEK: {
    label: 'DeepSeek',
    color: '#4d6bfe',
    glow: 'rgba(77,107,254,0.35)',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat (Recommended)', tier: 'free' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', tier: 'pro' },
    ],
    keyPlaceholder: 'sk-...',
    keyHint: 'Get a key at platform.deepseek.com',
  },
  OPENROUTER: {
    label: 'OpenRouter',
    color: '#7c5cfc',
    glow: 'rgba(124,92,252,0.35)',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    models: [
      { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free)', tier: 'free' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Free)', tier: 'free' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tier: 'pro' },
    ],
    keyPlaceholder: 'sk-or-...',
    keyHint: 'Get a key at openrouter.ai',
    needsBaseUrl: false,
  },
  CUSTOM: {
    label: 'Custom / Ollama',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.35)',
    defaultModel: 'llama3',
    models: [
      { id: 'llama3', label: 'Llama 3', tier: 'free' },
      { id: 'mistral', label: 'Mistral', tier: 'free' },
      { id: 'custom-model', label: 'Custom Model ID', tier: 'free' },
    ],
    keyPlaceholder: 'local-key or sk-...',
    keyHint: 'Ollama: http://localhost:11434/v1',
    needsBaseUrl: true,
  },
};

export const CARD_COLORS = [
  { color: '#7c5cfc', glow: 'rgba(124,92,252,0.35)' },
  { color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  { color: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
  { color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
];

/** Suggest provider type from key/name patterns — user can override. */
export function inferProviderType(name: string, key: string): ProviderType {
  const n = name.trim().toUpperCase();
  const k = key.trim();
  if (k.startsWith('sk-ant-') || n.includes('ANTHROPIC') || n.includes('CLAUDE')) return 'ANTHROPIC';
  if (n.includes('DEEPSEEK')) return 'DEEPSEEK';
  if (n.includes('OPENROUTER') || k.startsWith('sk-or-')) return 'OPENROUTER';
  if (k.startsWith('sk-') || n.includes('OPENAI') || n.includes('GPT')) return 'OPENAI';
  if (k.startsWith('AIza') || n.includes('GEMINI') || n.includes('GOOGLE')) return 'GEMINI';
  return 'CUSTOM';
}

export function defaultModelForProvider(type: ProviderType): string {
  return PROVIDER_META[type]?.defaultModel ?? 'gemini-2.0-flash';
}

export function resolveModelId(provider: Pick<AiProviderConfig, 'providerType' | 'modelId'>): string {
  const pType = provider.providerType;
  const model = provider.modelId?.trim();
  if (model) return model;
  return defaultModelForProvider(pType);
}

export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}

/** Build request headers for the active BYOK provider. */
export function buildProviderHeaders(provider: AiProviderConfig): Record<string, string> {
  const pType = provider.providerType.trim().toUpperCase() as ProviderType;
  const headers: Record<string, string> = {
    'x-provider-type': pType,
  };

  switch (pType) {
    case 'GEMINI':
      headers['x-gemini-key'] = provider.apiKeyRaw;
      break;
    case 'OPENAI':
      headers['x-openai-key'] = provider.apiKeyRaw;
      break;
    case 'ANTHROPIC':
      headers['x-anthropic-key'] = provider.apiKeyRaw;
      break;
    case 'DEEPSEEK':
      headers['x-deepseek-key'] = provider.apiKeyRaw;
      break;
    case 'OPENROUTER':
      headers['x-openrouter-key'] = provider.apiKeyRaw;
      if (provider.baseUrl) headers['x-custom-url'] = provider.baseUrl;
      break;
    case 'CUSTOM':
      headers['x-custom-key'] = provider.apiKeyRaw;
      if (provider.baseUrl) headers['x-custom-url'] = provider.baseUrl;
      break;
  }

  return headers;
}

/** Read all providers from localStorage. */
export function loadProvidersFromStorage(): AiProviderConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AI_PROVIDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<AiProviderConfig>[];
    return parsed.map((p, i) => ({
      id: p.id || `ap_local_${i}`,
      name: p.name || 'Unnamed Engine',
      apiKeyRaw: p.apiKeyRaw || '',
      baseUrl: p.baseUrl ?? null,
      providerType: (p.providerType?.toUpperCase() as ProviderType) || 'GEMINI',
      modelId: p.modelId || defaultModelForProvider((p.providerType?.toUpperCase() as ProviderType) || 'GEMINI'),
      isActive: !!p.isActive,
      createdAt: p.createdAt || new Date().toISOString(),
      colorIndex: p.colorIndex ?? i % CARD_COLORS.length,
    }));
  } catch {
    return [];
  }
}

/** Persist providers to localStorage and notify listeners. */
export function saveProvidersToStorage(providers: AiProviderConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
  window.dispatchEvent(new Event('storage'));
}

/** Get the currently active provider, if any. */
export function getActiveProvider(): AiProviderConfig | null {
  const providers = loadProvidersFromStorage();
  return providers.find((p) => p.isActive && p.apiKeyRaw && p.providerType) ?? null;
}

/** Headers for the active provider (empty if none active). */
export function getActiveProviderHeaders(): Record<string, string> {
  const active = getActiveProvider();
  if (!active) return {};
  return buildProviderHeaders(active);
}

/** Merge backend provider list with local storage (keys stay local). */
export function mergeProvidersFromBackend(
  local: AiProviderConfig[],
  backend: Array<{
    id: string;
    name: string;
    providerType: string;
    apiKey?: string;
    apiKeyMasked?: string;
    baseUrl?: string | null;
    isActive: boolean;
    createdAt: string;
  }>,
): AiProviderConfig[] {
  const localById = new Map(local.map((p) => [p.id, p]));

  return backend.map((b, i) => {
    const existing = localById.get(b.id);
    const pType = (b.providerType?.toUpperCase() as ProviderType) || 'GEMINI';
    return {
      id: b.id,
      name: b.name,
      apiKeyRaw: existing?.apiKeyRaw || b.apiKey || '',
      baseUrl: b.baseUrl ?? existing?.baseUrl ?? null,
      providerType: pType,
      modelId: existing?.modelId || defaultModelForProvider(pType),
      isActive: b.isActive,
      createdAt: b.createdAt,
      colorIndex: existing?.colorIndex ?? i % CARD_COLORS.length,
    };
  });
}

/** User-friendly error message from raw API error text. */
export function formatAiError(raw: string, providerType?: ProviderType): string {
  const lower = raw.toLowerCase();
  if (lower.includes('quota') || lower.includes('exhausted') || lower.includes('rate') || lower.includes('429')) {
    const tip = providerType === 'GEMINI'
      ? 'Try switching to **Gemini 2.0 Flash** in AI Engines — Pro models hit free-tier limits fast.'
      : 'Try a lighter model (Flash/Mini tier) or wait a minute and retry.';
    return `**Rate limit reached**\n\n${raw}\n\n${tip}`;
  }
  if (lower.includes('invalid') && lower.includes('key')) {
    return `**Invalid API key**\n\n${raw}\n\nCheck your key in AI Engines and re-test it.`;
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return `**Model not found**\n\n${raw}\n\nPick a different model in AI Engines settings.`;
  }
  return raw;
}

/** Build slide context string from structured slide data. */
export function formatSlideContext(slide: {
  id?: string;
  title?: string;
  topic?: string;
  bullets?: string[];
  content?: string;
  number?: number;
}): string {
  const parts: string[] = [];
  if (slide.topic) parts.push(`Topic: ${slide.topic}`);
  if (slide.title) parts.push(`Title: ${slide.title}`);
  if (slide.bullets?.length) {
    parts.push('Content:');
    slide.bullets.forEach((b, i) => parts.push(`  ${i + 1}. ${b}`));
  }
  if (slide.content) parts.push(slide.content);
  return parts.join('\n');
}
