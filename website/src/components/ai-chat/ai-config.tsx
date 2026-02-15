'use client';

import { useState } from 'react';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from './ai-models';

interface APIConfigProps {
  provider: 'anthropic' | 'openai';
  hasServerKeys: boolean;
  onConfigured: () => void;
}

export function AIConfig({ provider, hasServerKeys, onConfigured }: APIConfigProps) {
  const [useOwnKey, setUseOwnKey] = useState(!hasServerKeys);
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem('anthropic_api_key') || '');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [selectedProvider, setSelectedProvider] = useState<'anthropic' | 'openai'>(
    (localStorage.getItem('ai_provider') as 'anthropic' | 'openai') || 'anthropic',
  );
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('ai_model') || 'claude-sonnet-4-5',
  );

  function handleSave() {
    if (useOwnKey) {
      localStorage.setItem('anthropic_api_key', anthropicKey);
      localStorage.setItem('openai_api_key', openaiKey);
    } else {
      // Clear user keys when using server keys
      localStorage.removeItem('anthropic_api_key');
      localStorage.removeItem('openai_api_key');
    }
    localStorage.setItem('ai_provider', selectedProvider);
    localStorage.setItem('ai_model', selectedModel);
    onConfigured();
  }

  const models = selectedProvider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS;

  const canSave = useOwnKey
    ? selectedProvider === 'anthropic'
      ? !!anthropicKey
      : !!openaiKey
    : true;

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <h2 className="flex items-center h-10 text-xs font-medium pl-3 pr-2 py-2 border-b border-dark-border">
        AI configuration
      </h2>
      <div className="space-y-4 flex-1 py-3 px-2">
        {/* Provider Selection */}
        <div>
          <label className="block text-xs font-medium mb-2">Provider</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as 'anthropic' | 'openai')}
            className="appearance-none text-xs w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
          </select>
        </div>
        {/* Model Selection */}
        <div>
          <label className="block text-xs font-medium mb-2">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="appearance-none text-xs w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.cost} cost)
              </option>
            ))}
          </select>
        </div>

        {/* API Key Mode Toggle */}
        {hasServerKeys && (
          <div>
            <label className="block text-xs font-medium mb-2">API key</label>
            <select
              value={useOwnKey ? 'own' : 'server'}
              onChange={(e) => setUseOwnKey(e.target.value === 'own')}
              className="appearance-none text-xs w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="server">Use server-provided key</option>
              <option value="own">Use my own key</option>
            </select>
          </div>
        )}

        {/* API Key Input (only when using own key) */}
        {useOwnKey && (
          <>
            {/* Anthropic API Key */}
            {selectedProvider === 'anthropic' && (
              <div>
                <label className="block text-xs font-medium mb-2">Anthropic API key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="text-xs w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Get your API key at{' '}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>
            )}
            {/* OpenAI API Key */}
            {selectedProvider === 'openai' && (
              <div>
                <label className="block text-xs font-medium mb-2">OpenAI API key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="text-xs w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Get your API key at{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>
            )}
          </>
        )}

        {/* Security Notice */}
        <div className="bg-dark-hover border border-dark-border rounded p-2">
          <p className="text-xs text-gray-400">
            {useOwnKey ? (
              <>
                <strong>Security notice:</strong> API keys are stored in your browser's localStorage
                and sent to our server only to forward to{' '}
                {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'}. Your code and prompts
                will be sent to {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} for
                processing.
              </>
            ) : (
              <>
                <strong>Note:</strong> Your code and prompts will be sent to{' '}
                {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} for processing using
                server-provided API keys.
              </>
            )}
          </p>
        </div>
      </div>
      {/* Save Button */}
      <div className="pb-2 px-2 mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save configuration
        </button>
      </div>
    </div>
  );
}
