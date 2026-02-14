import clsx from 'clsx';
import { RuntimeStatus } from '../types';

interface StatusBarProps {
  status: RuntimeStatus;
  isRunning: boolean;
  usingWorker: boolean;
  onRun: () => void;
}

export function StatusBar({ status, isRunning, usingWorker, onRun }: StatusBarProps) {
  function getStatusLabel() {
    if (status === 'initializing') {
      return 'Initializing';
    }

    if (isRunning) {
      return 'Running';
    }

    if (status === 'error') {
      return 'Error';
    }

    return (
      <span>
        Ready{' '}
        {!usingWorker && (
          <span className="ml-1 rounded-lg border border-dark-border py-0.5 px-1.5 text-xs">
            Worker
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <span className={clsx('flex items-center gap-2', 'text-xs')}>
        <span
          className={clsx('inline-flex size-2 rounded-full', {
            'bg-yellow-500': isRunning,
            'bg-red-500': status === 'error',
            'bg-gray-500': status === 'initializing',
            'bg-green-500': status === 'ready' && !isRunning,
          })}
        />
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
