import { useState, useEffect } from "react";
import clsx from "clsx";
import { HiChevronRight, HiChevronDown } from "react-icons/hi2";
import type { FileTreeNode } from "../types";
import { buildFileTree } from "../utils/filesystem-tree";
import { RiRefreshLine } from "react-icons/ri";
import { VscNewFile, VscRefresh } from "react-icons/vsc";

interface FileTreeProps {
  filesystem: any;
  currentFile: string;
  version?: number;
  onSelectFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onAddFile: () => void;
  onRefresh: () => void;
}

export function FileTree({
  filesystem,
  currentFile,
  version = 0,
  onSelectFile,
  onDeleteFile,
  onAddFile,
  onRefresh,
}: FileTreeProps) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Build tree when filesystem changes or version updates
  useEffect(() => {
    if (!filesystem) return;

    const newTree = buildFileTree(filesystem, "/");
    setTree(newTree);

    // Only auto-expand root level on initial load (when there are no expanded paths)
    setExpandedPaths((prev) => {
      if (prev.size === 0) {
        const rootPaths = newTree.filter((node) => node.isDirectory).map((node) => node.path);
        return new Set(rootPaths);
      }
      return prev;
    });
  }, [filesystem, version]);

  const handleToggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-dark-border flex gap-2">
        <button onClick={onAddFile} className="btn-secondary text-xs p-1" title="Add new file">
          <VscNewFile className="size-4" />
        </button>
        <button
          onClick={onRefresh}
          className="btn-secondary text-xs p-1"
          title="Refresh filesystem"
        >
          <VscRefresh className="size-4" />
        </button>
      </div>
      <div className="flex-1 h-0 grow overflow-y-auto p-2">
        {!filesystem ? (
          <div className="text-gray-500 text-xs p-2">Loading filesystem...</div>
        ) : tree.length === 0 ? (
          <div className="text-gray-500 text-xs p-2">No files in filesystem</div>
        ) : (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                currentFile={currentFile}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                onSelectFile={onSelectFile}
                onDeleteFile={onDeleteFile}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileTreeNode;
  depth: number;
  currentFile: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
}

function FileTreeNode({
  node,
  depth,
  currentFile,
  expandedPaths,
  onToggle,
  onSelectFile,
  onDeleteFile,
}: FileTreeNodeProps) {
  const isExpanded = node.isDirectory && expandedPaths.has(node.path);
  const isSelected = !node.isDirectory && node.path === currentFile;

  // Calculate indentation (compact: 12px per level)
  const paddingLeft = depth * 16;

  if (node.isDirectory) {
    return (
      <>
        <li
          className={clsx(
            "flex items-center gap-1 pr-2 py-0.5 rounded cursor-pointer transition-colors text-sm",
            {
              "bg-gray-500/20 text-orange-400": isSelected,
              "hover:bg-dark-hover": !isSelected && !isExpanded,
            },
          )}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onToggle(node.path)}
        >
          {isExpanded ? (
            <HiChevronDown className="text-sm flex-shrink-0" />
          ) : (
            <HiChevronRight className="text-sm flex-shrink-0" />
          )}
          <span>{node.name}</span>
        </li>
        {isExpanded &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              currentFile={currentFile}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
            />
          ))}
      </>
    );
  }

  return (
    <li
      className={clsx(
        "flex items-center justify-between py-0.5 rounded cursor-pointer transition-colors text-sm",
        {
          "bg-gray-500/20 text-orange-400": isSelected,
          "hover:bg-dark-hover": !isSelected,
        },
      )}
      style={{ paddingLeft: `${paddingLeft + 6}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      <span className="truncate">{node.name}</span>
      {node.path !== "main.js" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(node.path);
          }}
          className="text-accent-red opacity-0 hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
          title="Delete file"
        >
          ×
        </button>
      )}
    </li>
  );
}
