/** Shared AI model defaults and error formatting for all providers. */

export type ProviderType =
  | 'GEMINI'
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'DEEPSEEK'
  | 'OPENROUTER'
  | 'CUSTOM';

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  GEMINI: 'gemini-2.0-flash',
  OPENAI: 'gpt-4o-mini',
  ANTHROPIC: 'claude-3-5-haiku-20241022',
  DEEPSEEK: 'deepseek-chat',
  OPENROUTER: 'google/gemini-2.0-flash-exp:free',
  CUSTOM: 'llama3',
};

export const MAX_INDEX_CHUNKS = 20;

export function resolveModel(providerType: string, modelName?: string): string {
  const pType = (providerType || '').toUpperCase() as ProviderType;
  const model = (modelName || '').trim();
  if (!model || model === 'gemini' || model === 'gpt-4o' || model === 'custom-model') {
    return DEFAULT_MODELS[pType] || DEFAULT_MODELS.GEMINI;
  }
  return model;
}

export function extractApiKeys(headers: Record<string, string>) {
  return {
    providerType: (headers['x-provider-type'] || '').toUpperCase() as ProviderType,
    geminiKey: headers['x-gemini-key'] || '',
    openaiKey: headers['x-openai-key'] || '',
    deepseekKey: headers['x-deepseek-key'] || '',
    anthropicKey: headers['x-anthropic-key'] || '',
    openrouterKey: headers['x-openrouter-key'] || '',
    customUrl: headers['x-custom-url'] || '',
    customKey: headers['x-custom-key'] || '',
  };
}

export function primaryApiKey(keys: ReturnType<typeof extractApiKeys>): string {
  const { providerType, geminiKey, openaiKey, deepseekKey, anthropicKey, openrouterKey, customKey } = keys;
  switch (providerType) {
    case 'GEMINI': return geminiKey;
    case 'OPENAI': return openaiKey;
    case 'ANTHROPIC': return anthropicKey;
    case 'DEEPSEEK': return deepseekKey;
    case 'OPENROUTER': return openrouterKey;
    case 'CUSTOM': return customKey;
    default: return geminiKey || openaiKey || deepseekKey || anthropicKey || openrouterKey || customKey;
  }
}

export function formatProviderError(
  provider: string,
  status: number,
  message: string,
): string {
  const lower = (message || '').toLowerCase();
  if (status === 429 || lower.includes('quota') || lower.includes('exhausted') || lower.includes('rate')) {
    return `### Rate Limit Reached\n\n**${provider}** returned a quota/rate-limit error.\n\n> ${message}\n\n**Tips:**\n- Switch to a lighter model (Flash / Mini tier) in AI Engines\n- Wait 30–60 seconds and try again\n- Free-tier keys have strict per-minute limits`;
  }
  if (status === 401 || status === 403 || lower.includes('invalid') && lower.includes('key')) {
    return `### Invalid API Key\n\n**${provider}** rejected your key.\n\n> ${message}\n\nRe-enter your key in **AI Engines** and click **Test & Add**.`;
  }
  if (status === 404 || lower.includes('not found')) {
    return `### Model Not Found\n\nThe model may be unavailable in your region or on your plan.\n\n> ${message}\n\nTry a recommended model like \`${DEFAULT_MODELS.GEMINI}\` or \`${DEFAULT_MODELS.OPENAI}\`.`;
  }
  return `### ${provider} API Error\n\nStatus: ${status}\n\n> ${message || 'Unknown error'}`;
}
