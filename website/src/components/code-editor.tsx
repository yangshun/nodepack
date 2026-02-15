'use client';

import { useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';

// Self-host Monaco editor to avoid COEP issues with CDN workers
loader.config({ monaco });

interface CodeEditorProps {
  code: string;
  currentFile: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export function CodeEditor({ code, currentFile, onChange, onRun }: CodeEditorProps) {
  const onRunRef = useRef(onRun);

  // Keep the ref up to date with the latest onRun
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, monacoInstance: any) {
    // Register keyboard shortcut: Cmd/Ctrl + Enter to run
    // Use the ref so it always calls the latest onRun function
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      onRunRef.current();
    });
  }

  function handleEditorChange(value: string | undefined) {
    onChange(value || '');
  }

  // Determine language from file extension
  function getLanguage(filename: string) {
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    return 'javascript';
  }

  if (!currentFile) {
    return (
      <div className="h-full overflow-hidden flex items-center justify-center bg-dark-bg text-gray-500 text-sm">
        No files open. Select a file from the file explorer to start editing.
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <Editor
        key={currentFile}
        height="100%"
        language={getLanguage(currentFile)}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
