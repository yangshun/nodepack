import clsx from 'clsx';
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
    if (isRunning) return 'Running...';
    if (status === 'error') return 'Error';
    return `Ready (${usingWorker ? 'Web Worker' : 'Direct'})`;
  };

  return (
    <div className="flex items-center gap-4">
      <span
        className={clsx('status-badge', {
          'text-gray-400': status === 'initializing',
          'status-running': isRunning,
          'status-error': status === 'error',
          'status-ready': status === 'ready' && !isRunning,
        })}
      >
        {getStatusLabel()}
      </span>
      <button
        onClick={onRun}
        disabled={status !== 'ready' || isRunning}
        className="btn-primary flex items-center gap-2"
      >
        <span>Run code</span>
      </button>
    </div>
  );
}
