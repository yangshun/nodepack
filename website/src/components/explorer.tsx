'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { HiChevronRight, HiChevronDown } from 'react-icons/hi2';
import type { FileTreeNode } from '../types';
import { buildFileTree } from '../utils/filesystem-tree';
import { VscNewFile, VscRefresh, VscFile, VscJson, VscMarkdown } from 'react-icons/vsc';
import type { IconType } from 'react-icons';
import { DiJavascript1 } from 'react-icons/di';
import { BiLogoTypescript } from 'react-icons/bi';

function getFileIcon(filename: string): IconType {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return DiJavascript1;
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return BiLogoTypescript;
    case 'json':
    case 'jsonc':
      return VscJson;
    case 'md':
    case 'mdx':
    case 'markdown':
      return VscMarkdown;
    default:
      return VscFile;
  }
}

interface FileTreeProps {
  title?: string;
  filesystem: any;
  currentFile: string;
  version?: number;
  onSelectFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onAddFile: () => void;
  onRefresh: () => void;
  onInstallPackage: (packageName?: string) => Promise<void>;
  installDisabled: boolean;
  onExecuteScript: (scriptName: string) => Promise<void>;
}

export function Explorer({
  title,
  filesystem,
  currentFile,
  version = 0,
  onSelectFile,
  onDeleteFile,
  onAddFile,
  onRefresh,
  onInstallPackage,
  installDisabled,
  onExecuteScript,
}: FileTreeProps) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [packageName, setPackageName] = useState('');
  const lastValidScriptsRef = useRef<Record<string, string>>({});

  // Build tree when filesystem changes or version updates
  useEffect(() => {
    if (!filesystem) return;

    const newTree = buildFileTree(filesystem, '/');
    setTree(newTree);

    // Preserve expanded state during re-renders, no auto-expansion
  }, [filesystem, version]);

  // Read package.json and extract npm scripts
  const npmScripts: Record<string, string> = useMemo(() => {
    if (!filesystem) {
      lastValidScriptsRef.current = {};
      return {};
    }

    try {
      const packageJsonPath = '/package.json';
      if (filesystem.existsSync(packageJsonPath)) {
        const packageJsonContent = filesystem.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        const scripts = packageJson.scripts || {};
        // Store the valid scripts
        lastValidScriptsRef.current = scripts;
        return scripts;
      }
      // No package.json exists
      lastValidScriptsRef.current = {};
      return {};
    } catch {
      // Invalid JSON - return the last valid state
      return lastValidScriptsRef.current;
    }
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
      <div className="flex justify-between items-center pl-3 pr-2 pt-2">
        <div className="text-xs text-gray-400 font-medium uppercase truncate">{title}</div>
        <div className="flex gap-1 items-center">
          <button onClick={onAddFile} className="btn-tertiary text-xs p-1" title="Add new file">
            <VscNewFile className="size-4" />
          </button>
          <button
            onClick={onRefresh}
            className="btn-tertiary text-xs p-1"
            title="Refresh filesystem"
          >
            <VscRefresh className="size-4" />
          </button>
        </div>
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
      <div className="pb-2 px-2">
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          placeholder="Install package (e.g., clsx, zod)"
          className="w-full px-2 py-2 bg-dark-bg border border-dark-border rounded text-xs focus:outline-none focus:border-orange-500"
          disabled={installDisabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && packageName.trim()) {
              onInstallPackage(packageName.trim()).catch((error) => {
                console.error('Failed to install:', error);
              });
              setPackageName('');
            }
          }}
        />
      </div>
      {Object.keys(npmScripts).length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dark-border py-2">
          <div className="px-3 text-xs text-gray-400 font-medium uppercase">npm Scripts</div>
          <div className="px-2 space-y-1">
            {Object.entries(npmScripts).map(([name, command]) => (
              <button
                key={name}
                onClick={() => {
                  onExecuteScript(name).catch((error) => {
                    console.error('Failed to execute script:', error);
                  });
                }}
                className="w-full text-left px-1 py-0.5 text-xs rounded hover:bg-dark-hover transition-colors text-gray-300 hover:text-orange-400 truncate"
                title={`Run: ${command}`}
              >
                {name} <span className="ml-2 text-gray-500">{command}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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

  const paddingLeft = depth * 16 + 2;

  if (node.isDirectory) {
    return (
      <>
        <li
          className={clsx(
            'flex items-center gap-1 pr-2 py-0.5 rounded cursor-pointer transition-colors text-xs hover:bg-dark-hover',
            {
              'bg-gray-500/20 text-orange-400': isSelected,
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

  const FileIcon = getFileIcon(node.name);

  return (
    <li
      className={clsx(
        'flex items-center justify-between py-0.5 rounded cursor-pointer transition-colors text-xs',
        {
          'bg-gray-500/20 text-orange-400': isSelected,
          'hover:bg-dark-hover': !isSelected,
        },
      )}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      <div className="flex items-center gap-1 truncate">
        <FileIcon className="text-gray-400 text-sm flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
      {node.path !== 'main.js' && (
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
