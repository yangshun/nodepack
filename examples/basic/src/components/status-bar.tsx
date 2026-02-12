import clsx from "clsx";
import { RuntimeStatus } from "../types";

interface StatusBarProps {
  status: RuntimeStatus;
  isRunning: boolean;
  usingWorker: boolean;
  onRun: () => void;
}

export function StatusBar({ status, isRunning, usingWorker, onRun }: StatusBarProps) {
  const getStatusLabel = () => {
    if (status === "initializing") return "Initializing...";
    if (isRunning) return "⚙️ Running...";
    if (status === "error") return "❌ Error";
    return `✅ Ready (${usingWorker ? "Web Worker" : "Direct"})`;
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onRun}
        disabled={status !== "ready" || isRunning}
        className="btn-primary flex items-center gap-2"
      >
        <span>▶</span>
        <span>Run Code</span>
      </button>
      <span className={clsx("status-badge", {
        "text-gray-400": status === "initializing",
        "status-running": isRunning,
        "status-error": status === "error",
        "status-ready": status === "ready" && !isRunning,
      })}>{getStatusLabel()}</span>
      <span className="text-xs text-gray-500">Press Cmd/Ctrl+Enter to run</span>
    </div>
  );
}
