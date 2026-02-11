interface CodeEditorProps {
  code: string;
  currentFile: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export function CodeEditor({
  code,
  currentFile,
  onChange,
  onRun,
  isRunning,
}: CodeEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>📝 Editor</span>
        <span className="text-accent-primary font-mono text-xs">{currentFile}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-dark-bg text-gray-300 font-mono text-sm p-4
                     resize-none focus:outline-none focus:ring-1 focus:ring-accent-blue"
          spellCheck={false}
          placeholder="// Write your Node.js code here..."
        />
      </div>
    </div>
  );
}
