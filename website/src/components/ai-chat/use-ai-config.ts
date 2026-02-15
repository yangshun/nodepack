import { useLocalStorage } from 'usehooks-ts';

// Storage keys
const AI_STORAGE_KEYS = {
  ANTHROPIC_API_KEY: 'anthropic_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  AI_PROVIDER: 'ai_provider',
  AI_MODEL: 'ai_model',
} as const;

// Custom hooks for AI configuration

export function useAnthropicApiKey() {
  return useLocalStorage<string>(AI_STORAGE_KEYS.ANTHROPIC_API_KEY, '');
}

export function useOpenaiApiKey() {
  return useLocalStorage<string>(AI_STORAGE_KEYS.OPENAI_API_KEY, '');
}

export function useAiProvider() {
  return useLocalStorage<'anthropic' | 'openai'>(AI_STORAGE_KEYS.AI_PROVIDER, 'anthropic');
}

export function useAiModel() {
  return useLocalStorage<string>(AI_STORAGE_KEYS.AI_MODEL, 'claude-sonnet-4-5');
}
