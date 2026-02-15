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
import { VscArrowRight } from 'react-icons/vsc';
import { RiLoader4Line } from 'react-icons/ri';

interface AIChatProps {
  nodepack: Nodepack | null;
  apiKey: string | null;
  provider: 'anthropic' | 'openai';
  model: string;
  onFileUpdate: () => void;
  terminalRef: React.RefObject<TerminalHandle>;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: 'call' | 'result';
  args?: unknown;
  result?: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
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
        toolInvocations: [],
      };

      // Add assistant message placeholder
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      for await (const chunk of result.fullStream) {
        if (chunk.type === 'text-delta') {
          assistantContent += chunk.text;
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = assistantContent;
            }
            return updated;
          });
        } else if (chunk.type === 'tool-call') {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              if (!lastMsg.toolInvocations) {
                lastMsg.toolInvocations = [];
              }

              lastMsg.toolInvocations.push({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                state: 'call',
                args: chunk.input,
              });
            }
            return updated;
          });
        } else if (chunk.type === 'tool-result') {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant' && lastMsg.toolInvocations) {
              const toolInvocation = lastMsg.toolInvocations.find(
                (tool) => tool.toolCallId === chunk.toolCallId,
              );

              if (toolInvocation) {
                toolInvocation.state = 'result';
                toolInvocation.result = chunk.output;
              }
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
            className={clsx(
              'p-2 rounded whitespace-pre-wrap',
              message.role === 'user'
                ? 'bg-dark-hover ml-8'
                : 'bg-dark-bg border border-dark-border mr-8',
            )}
          >
            <div className="text-xs text-gray-400 mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="text-xs">{message.content}</div>
            {/* Show tool calls */}
            {message.toolInvocations?.map((tool) => (
              <div key={tool.toolCallId} className="text-xs text-gray-400 mt-2 italic">
                {tool.state === 'result' ? `✓ ${tool.toolName}` : `⋯ ${tool.toolName}...`}
              </div>
            ))}
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
