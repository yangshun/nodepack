import { RuntimeStatus } from '../types';

interface StatusBarProps {
  status: RuntimeStatus;
  isRunning: boolean;
  usingWorker: boolean;
  onRun: () => void;
}

export function StatusBar({ status, isRunning, usingWorker, onRun }: StatusBarProps) {
  const getStatusLabel = () => {
    if (status === 'initializing') return 'Initializing...';
    if (isRunning) return '⚙️ Running...';
    if (status === 'error') return '❌ Error';
    return `✅ Ready (${usingWorker ? 'Web Worker' : 'Direct'})`;
  };

  const getStatusClass = () => {
    if (status === 'initializing') return 'text-gray-400';
    if (isRunning) return 'status-running';
    if (status === 'error') return 'status-error';
    return 'status-ready';
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onRun}
        disabled={status !== 'ready' || isRunning}
        className="btn-primary flex items-center gap-2"
      >
        <span>▶</span>
        <span>Run Code</span>
      </button>
      <span className={`status-badge ${getStatusClass()}`}>{getStatusLabel()}</span>
      <span className="text-xs text-gray-500">
        Press Cmd/Ctrl+Enter to run
      </span>
    </div>
  );
}
