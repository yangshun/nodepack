'use client';

import { useRef, useEffect, useState } from 'react';
import type { useChat } from '@ai-sdk/react';
import { AIConfig } from './ai-config';
import { AILoadingIndicator } from './ai-loading-indicator';
import clsx from 'clsx';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VscArrowRight, VscClose } from 'react-icons/vsc';
import { RiCircleFill, RiLoader4Line } from 'react-icons/ri';

const TOOLS: Record<string, { title: string; detailKey: string }> = {
  readFile: { title: 'Read file', detailKey: 'path' },
  writeFile: { title: 'Write file', detailKey: 'path' },
  listDirectory: { title: 'List directory', detailKey: 'path' },
  executeCode: { title: 'Execute code', detailKey: 'filepath' },
  installPackage: { title: 'Install package', detailKey: 'packageName' },
  runBashCommand: { title: 'Run command', detailKey: 'command' },
};

interface AIChatProps {
  apiKey: string | null;
  hasServerKeys: boolean;
  provider: 'anthropic' | 'openai';
  onClose: () => void;
  messages: ReturnType<typeof useChat>['messages'];
  sendMessage: ReturnType<typeof useChat>['sendMessage'];
  status: ReturnType<typeof useChat>['status'];
  defaultChoices?: string[];
}

export function AIChat({
  apiKey,
  hasServerKeys,
  provider,
  onClose,
  messages,
  sendMessage,
  status,
  defaultChoices = [
    'Explain the code',
    'How can I improve the code?',
    'Run the code and show me the output',
  ],
}: AIChatProps) {
  const [showConfig, setShowConfig] = useState(!apiKey && !hasServerKeys);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!input.trim() || status !== 'ready') {
      return;
    }

    sendMessage({ text: input });
    setInput('');
  }

  function handleChoiceClick(choice: string) {
    if (status !== 'ready') {
      return;
    }

    sendMessage({ text: choice });
  }

  if (showConfig || (!apiKey && !hasServerKeys)) {
    return (
      <AIConfig
        provider={provider}
        hasServerKeys={hasServerKeys}
        onConfigured={() => {
          setShowConfig(false);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* Header */}
      <div className="h-10 pl-3 pr-2 py-2 border-b border-dark-border flex justify-between items-center">
        <h2 className="text-xs font-medium">AI assistant</h2>
        <div className="flex items-center gap-1">
          {/* <button
            onClick={() => setShowConfig(true)}
            className="btn-tertiary px-2"
            title="AI settings"
          >
            {provider === 'anthropic' ? 'Claude' : 'GPT'}
          </button> */}
          <button onClick={onClose} className="btn-tertiary" title="Close sidebar">
            <VscClose className="size-4" />
          </button>
        </div>
      </div>
      {/* Messages */}
      <div
        className={clsx(
          'flex-1 overflow-y-auto p-2 space-y-2',
          messages.length === 0 && 'flex items-center justify-center',
        )}
      >
        {messages.length === 0 && (
          <div className="p-8">
            <p className="text-center mb-4 text-gray-400">What can I do for you?</p>
            {defaultChoices && defaultChoices.length > 0 ? (
              <div className="space-y-2">
                {defaultChoices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoiceClick(choice)}
                    disabled={status !== 'ready'}
                    className="w-full text-left text-xs p-3 rounded-lg border border-dark-border hover:bg-dark-hover hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs space-y-1 text-gray-400">
                <p>I can read and edit files</p>
                <p>Run code and install packages</p>
                <p>Execute bash commands</p>
              </div>
            )}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx('rounded', message.role === 'user' ? 'pt-4' : 'bg-dark-bg pt-2 pb-4')}
          >
            {message.parts?.map((part, index) => {
              if (part.type === 'text') {
                return (
                  <div key={`text-${index}`} className={clsx('text-xs', index > 0 && 'mt-2')}>
                    {message.role === 'assistant' ? (
                      <div className="ai-chat-markdown">
                        <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
                      </div>
                    ) : (
                      <p className="w-fit rounded-lg bg-dark-hover p-2 border border-dark-border">
                        {part.text}
                      </p>
                    )}
                  </div>
                );
              }

              if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
                const toolPart = part as {
                  toolCallId: string;
                  toolName?: string;
                  type: string;
                  state: string;
                  input?: Record<string, unknown>;
                };
                const toolName = toolPart.toolName ?? toolPart.type.replace('tool-', '');
                const toolDef = TOOLS[toolName];
                const title = toolDef?.title ?? toolName;
                const detail = toolPart.input?.[toolDef?.detailKey] as string | undefined;
                const isComplete = toolPart.state === 'output-available';

                return (
                  <div
                    key={toolPart.toolCallId}
                    className={clsx(
                      'flex items-center gap-1',
                      'text-xs text-gray-400',
                      index > 0 && 'mt-2',
                    )}
                  >
                    <RiCircleFill
                      className={clsx(
                        'size-1.5 inline-block shrink-0',
                        isComplete && 'text-green-300',
                      )}
                    />
                    <span>
                      {title}
                      {detail && <span className="text-gray-500"> {detail}</span>}
                    </span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        ))}
        {status !== 'ready' && <AILoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border border-dark-border p-2 m-2 rounded focus-within:ring-1 focus-within:ring-orange-500 "
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask me anything about your code..."
          className="text-xs w-full bg-dark-bg text-white rounded resize-none focus:outline-none min-h-[40px]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
        />
        <button
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="self-end p-1.5 rounded bg-gray-200 hover:bg-white text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {status !== 'ready' ? (
            <RiLoader4Line className="animate-spin size-4" />
          ) : (
            <VscArrowRight className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}
