import { useState } from 'react';
import { examples } from '../examples';

interface ExampleButtonsProps {
  onSelectExample: (exampleId: string) => void;
}

export function ExampleButtons({ onSelectExample }: ExampleButtonsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handlePrevious() {
    const newIndex = currentIndex === 0 ? examples.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onSelectExample(examples[newIndex].id);
  }

  function handleNext() {
    const newIndex = currentIndex === examples.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onSelectExample(examples[newIndex].id);
  }

  function handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = event.target.value;
    const newIndex = examples.findIndex((ex) => ex.id === selectedId);
    if (newIndex !== -1) {
      setCurrentIndex(newIndex);
      onSelectExample(selectedId);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevious}
        className="btn-secondary px-3"
        title="Previous example"
      >
        ←
      </button>
      <select
        value={examples[currentIndex].id}
        onChange={handleSelectChange}
        className="btn-secondary px-4 py-2 cursor-pointer"
      >
        {examples.map((example) => (
          <option key={example.id} value={example.id}>
            {example.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleNext}
        className="btn-secondary px-3"
        title="Next example"
      >
        →
      </button>
    </div>
  );
}
