import clsx from "clsx";
import { VscClose } from "react-icons/vsc";

interface FileTabsProps {
  openFiles: string[];
  currentFile: string;
  onSelectTab: (filename: string) => void;
  onCloseTab: (filename: string) => void;
}

export function FileTabs({ openFiles, currentFile, onSelectTab, onCloseTab }: FileTabsProps) {
  function getFilename(filepath: string): string {
    const lastSlash = filepath.lastIndexOf("/");
    return lastSlash !== -1 ? filepath.substring(lastSlash + 1) : filepath;
  }

  if (openFiles.length === 0) {
    return null;
  }

  return (
    <div className="h-[41px] flex items-center border-b border-dark-border overflow-x-auto">
      {openFiles.map((filename, index) => {
        const isActive = filename === currentFile;
        const displayName = getFilename(filename);

        return (
          <div
            key={filename}
            className={clsx(
              "h-full flex items-center gap-2 px-3 py-2.5 text-xs border-b-0 transition-colors cursor-pointer flex-shrink-0",
              "border-t-2 border-dark-border",
              index > 0 && "border-l ",
              index === openFiles.length - 1 && "border-r",
              isActive
                ? " border-t-orange-500 bg-dark-panel"
                : "border-t-transparent bg-dark-bg hover:bg-dark-hover",
            )}
            onClick={() => onSelectTab(filename)}
          >
            <span className="truncate max-w-[120px]" title={filename}>
              {displayName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(filename);
              }}
              className="ml-1 hover:text-orange-400 transition-colors"
              title={`Close ${filename}`}
            >
              <VscClose className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
