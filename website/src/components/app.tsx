'use client';

import { useState, useMemo } from 'react';

import { Workspace } from './workspace';
import { ExampleButtons } from './example-buttons';
import { examples } from '../examples';
import type { FileMap } from '../types';
import { RiGithubFill } from 'react-icons/ri';

function getInitialExampleId(): string {
  const hash = window.location.hash.slice(1);

  if (hash && examples.some((ex) => ex.id === hash)) {
    return hash;
  }

  return examples[0].id;
}

export function App() {
  const [selectedExampleId, setSelectedExampleId] = useState(getInitialExampleId);

  const selectedExample = useMemo(
    () => examples.find((ex) => ex.id === selectedExampleId),
    [selectedExampleId],
  );

  const initialFiles = useMemo<FileMap>(() => {
    if (!selectedExample) {
      return { 'main.js': "console.log('Hello, world!');" };
    }

    return selectedExample.files;
  }, [selectedExample]);

  function handleSelectExample(exampleId: string) {
    setSelectedExampleId(exampleId);
    window.history.replaceState(null, '', `#${exampleId}`);
  }

  const initialIndex = examples.findIndex((ex) => ex.id === selectedExampleId);

  return (
    <div className="min-h-screen p-3 flex flex-col gap-3 mx-auto">
      <div className="flex items-center gap-8 justify-between">
        <div className="flex items-center gap-8">
          <h1
            className="text-xl font-medium text-white"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Nodepack
          </h1>
          <ExampleButtons
            examples={examples}
            initialIndex={initialIndex >= 0 ? initialIndex : 0}
            onSelectExample={handleSelectExample}
          />
        </div>
        <a
          className="px-2"
          href="https://github.com/yangshun/nodepack"
          target="_blank"
          rel="noopener noreferrer"
        >
          <RiGithubFill className="size-6" />
        </a>
      </div>
      <div className="h-0 grow">
        <Workspace
          key={selectedExampleId}
          ai={!!selectedExample?.ai}
          title={selectedExample?.label}
          initialFiles={initialFiles}
        />
      </div>
    </div>
  );
}
