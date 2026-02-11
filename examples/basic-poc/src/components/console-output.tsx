interface ConsoleOutputProps {
  logs: string[];
  onClear: () => void;
}

export function ConsoleOutput({ logs, onClear }: ConsoleOutputProps) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>📺 Console Output</span>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-white">
          🗑 Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-dark-bg">
        {logs.length === 0 ? (
          <p className="text-gray-500 italic text-sm">
            No output yet. Click "Run Code" to execute.
          </p>
        ) : (
          <pre className="font-mono text-sm whitespace-pre-wrap break-words">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}
