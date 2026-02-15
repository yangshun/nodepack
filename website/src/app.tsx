import { useState, useMemo } from 'react';

import { Workspace } from './workspace';
import { ExampleButtons } from './components/example-buttons';
import { examples } from './examples';
import type { FileMap } from './types';

function getInitialExampleId(): string {
  const hash = window.location.hash.slice(1);

  if (hash && examples.some((ex) => ex.id === hash)) {
    return hash;
  }

  return examples[0].id;
}

export function App() {
  const [selectedExampleId, setSelectedExampleId] = useState(getInitialExampleId);

  const initialFiles = useMemo<FileMap>(() => {
    const example = examples.find((ex) => ex.id === selectedExampleId);

    if (!example) {
      return { 'main.js': '' };
    }

    return example.files
      ? { 'main.js': example.code, ...example.files }
      : { 'main.js': example.code };
  }, [selectedExampleId]);

  function handleSelectExample(exampleId: string) {
    setSelectedExampleId(exampleId);
    window.history.replaceState(null, '', `#${exampleId}`);
  }

  const initialIndex = examples.findIndex((ex) => ex.id === selectedExampleId);

  return (
    <div className="min-h-screen p-3 flex flex-col gap-3 mx-auto">
      <div className="flex items-center gap-4">
        <ExampleButtons
          examples={examples}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          onSelectExample={handleSelectExample}
        />
      </div>
      <div className="h-0 grow">
        <Workspace key={selectedExampleId} initialFiles={initialFiles} />
      </div>
    </div>
  );
}
