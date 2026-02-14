import { useState } from 'react';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from './models';

interface APIConfigProps {
  provider: 'anthropic' | 'openai';
  onConfigured: () => void;
}

export function APIConfig({ provider, onConfigured }: APIConfigProps) {
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem('anthropic_api_key') || '');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [selectedProvider, setSelectedProvider] = useState<'anthropic' | 'openai'>(
    (localStorage.getItem('ai_provider') as 'anthropic' | 'openai') || 'anthropic',
  );
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('ai_model') || 'claude-sonnet-4.5-20250514',
  );

  function handleSave() {
    localStorage.setItem('anthropic_api_key', anthropicKey);
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('ai_provider', selectedProvider);
    localStorage.setItem('ai_model', selectedModel);
    onConfigured();
  }

  const models = selectedProvider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS;

  return (
    <div className="h-full flex flex-col bg-dark-bg p-6">
      <h2 className="text-lg font-medium mb-4">AI Configuration</h2>

      <div className="space-y-6 flex-1">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Provider</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as 'anthropic' | 'openai')}
            className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
          </select>
        </div>

        {/* Anthropic API Key */}
        {selectedProvider === 'anthropic' && (
          <div>
            <label className="block text-sm font-medium mb-2">Anthropic API key</label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <label className="block text-sm font-medium mb-2">OpenAI API key</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.cost} cost)
              </option>
            ))}
          </select>
        </div>

        {/* Security Warning */}
        <div className="bg-dark-hover border border-dark-border rounded p-4">
          <p className="text-xs text-gray-400">
            <strong>Security notice:</strong> API keys are stored in your browser's localStorage and
            never sent to our servers. Your code and prompts will be sent to{' '}
            {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} for processing.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={selectedProvider === 'anthropic' ? !anthropicKey : !openaiKey}
        className="w-full mt-6 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Save configuration
      </button>
    </div>
  );
}
