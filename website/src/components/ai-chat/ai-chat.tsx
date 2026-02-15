import { useMemo, useState, useRef, useEffect } from 'react';
import { streamText, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelMessage } from 'ai';
import type { Nodepack } from '@nodepack/client';
import type { TerminalHandle } from '../terminal/terminal';
import { createTools } from './tools';
import { APIConfig } from './api-config';
import clsx from 'clsx';
import Markdown from 'react-markdown';
import { VscArrowRight } from 'react-icons/vsc';
import { RiCircleFill, RiLoader4Line } from 'react-icons/ri';

interface AIChatProps {
  nodepack: Nodepack | null;
  apiKey: string | null;
  provider: 'anthropic' | 'openai';
  model: string;
  onFileUpdate: () => void;
  terminalRef: React.RefObject<TerminalHandle>;
}

type MessagePart =
  | { type: 'text'; content: string }
  | {
      type: 'tool';
      toolCallId: string;
      toolName: string;
      state: 'call' | 'result';
      args?: unknown;
      result?: unknown;
    };

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: MessagePart[];
}

export function AIChat({
  nodepack,
  apiKey,
  provider,
  model,
  onFileUpdate,
  terminalRef,
}: AIChatProps) {
  const [showConfig, setShowConfig] = useState(!apiKey);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tools = useMemo(
    () => createTools(nodepack, onFileUpdate, terminalRef),
    [nodepack, onFileUpdate, terminalRef],
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || isLoading || !apiKey) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const modelInstance =
        provider === 'anthropic'
          ? createAnthropic({
              apiKey: apiKey!,
              baseURL: '/proxy/anthropic/v1',
              headers: {
                'anthropic-dangerous-direct-browser-access': 'true',
              },
            })(model)
          : createOpenAI({
              apiKey: apiKey!,
              baseURL: '/proxy/openai/v1',
            })(model);

      const result = await streamText({
        model: modelInstance,
        messages: [...messages, userMessage].map(
          (message): ModelMessage => ({ role: message.role, content: message.content }),
        ),
        tools,
        stopWhen: stepCountIs(20),
      });

      let assistantContent = '';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        parts: [],
      };

      // Add assistant message placeholder
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response using immutable updates to avoid
      // duplicate entries from React strict mode double-invocation.
      for await (const chunk of result.fullStream) {
        if (chunk.type === 'text-delta') {
          assistantContent += chunk.text;
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              const parts = [...(lastMsg.parts ?? [])];
              const lastPart = parts[parts.length - 1];
              if (lastPart && lastPart.type === 'text') {
                parts[parts.length - 1] = {
                  ...lastPart,
                  content: lastPart.content + chunk.text,
                };
              } else {
                parts.push({ type: 'text', content: chunk.text });
              }
              updated[updated.length - 1] = {
                ...lastMsg,
                content: assistantContent,
                parts,
              };
            }
            return updated;
          });
        } else if (chunk.type === 'tool-call') {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              updated[updated.length - 1] = {
                ...lastMsg,
                parts: [
                  ...(lastMsg.parts ?? []),
                  {
                    type: 'tool' as const,
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    state: 'call' as const,
                    args: chunk.input,
                  },
                ],
              };
            }
            return updated;
          });
        } else if (chunk.type === 'tool-result') {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              updated[updated.length - 1] = {
                ...lastMsg,
                parts: (lastMsg.parts ?? []).map((part) =>
                  part.type === 'tool' && part.toolCallId === chunk.toolCallId
                    ? {
                        ...part,
                        state: 'result' as const,
                        result: chunk.output,
                      }
                    : part,
                ),
              };
            }
            return updated;
          });
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  if (showConfig || !apiKey) {
    return (
      <APIConfig
        provider={provider}
        onConfigured={() => {
          setShowConfig(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* Header */}
      <div className="h-10 p-2 border-b border-dark-border flex justify-between items-center">
        <h3 className="text-sm font-medium">AI assistant</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">{provider === 'anthropic' ? 'Claude' : 'GPT'}</div>
          <button
            onClick={() => setShowConfig(true)}
            className="text-xs text-gray-400 hover:text-white"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center p-8 text-gray-400">
            <p className="mb-4">Ask me to help with your code</p>
            <div className="text-xs space-y-1">
              <p>I can read and edit files</p>
              <p>Run code and install packages</p>
              <p>Execute bash commands</p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx('rounded', message.role === 'user' ? 'pt-4' : 'bg-dark-bg pt-2 pb-4')}
          >
            {message.parts && message.parts.length > 0 ? (
              message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <div key={`text-${index}`} className={clsx('text-xs', index > 0 && 'mt-2')}>
                      {message.role === 'assistant' ? (
                        <div className="ai-chat-markdown">
                          <Markdown>{part.content}</Markdown>
                        </div>
                      ) : (
                        <p className="w-fit rounded-lg bg-dark-hover p-2 border border-dark-border">
                          {part.content}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={part.toolCallId}
                    className={clsx(
                      'flex items-center gap-1',
                      'text-xs text-gray-400',
                      index > 0 && 'mt-2',
                    )}
                  >
                    <RiCircleFill
                      className={clsx(
                        'size-1.5 inline-block',
                        part.state === 'result' && 'text-green-300',
                      )}
                    />
                    {part.toolName}
                  </div>
                );
              })
            ) : (
              <div className="text-xs">
                {message.role === 'assistant' ? (
                  <div className="ai-chat-markdown">
                    <Markdown>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="w-fit rounded-lg bg-dark-hover p-2 border border-dark-border">
                    {message.content}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="text-xs text-gray-400 italic">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border border-dark-border p-2 m-2 rounded focus-within:ring-1 focus-within:ring-orange-500 "
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your code..."
          className="text-xs w-full bg-dark-bg text-white rounded resize-none focus:outline-none min-h-[40px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="self-end p-1.5 rounded bg-gray-200 hover:bg-white text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isLoading ? (
            <RiLoader4Line className="animate-spin size-4" />
          ) : (
            <VscArrowRight className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}
