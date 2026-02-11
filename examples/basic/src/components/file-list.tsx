import { FileMap } from '../types';

interface FileListProps {
  files: FileMap;
  currentFile: string;
  onSelectFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onAddFile: () => void;
}

export function FileList({
  files,
  currentFile,
  onSelectFile,
  onDeleteFile,
  onAddFile,
}: FileListProps) {
  const fileList = Object.keys(files).sort();

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">📁 Files</div>
      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {fileList.map((filename) => (
            <li
              key={filename}
              className={`
                flex items-center justify-between px-3 py-2 rounded cursor-pointer
                transition-colors font-mono text-sm
                ${
                  filename === currentFile
                    ? 'bg-gray-700 text-accent-primary'
                    : 'hover:bg-dark-hover'
                }
              `}
              onClick={() => onSelectFile(filename)}
            >
              <span>{filename}</span>
              {filename !== 'main.js' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(filename);
                  }}
                  className="text-accent-red opacity-0 hover:opacity-100 transition-opacity ml-2"
                  title="Delete file"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="p-3 border-t border-dark-border">
        <button onClick={onAddFile} className="btn-secondary w-full text-xs">
          + New File
        </button>
      </div>
    </div>
  );
}
