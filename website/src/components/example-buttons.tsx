import { useState } from 'react';
import { examples } from '../examples';
import { VscArrowLeft, VscArrowRight, VscChevronLeft, VscChevronRight } from 'react-icons/vsc';

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
    <div className="flex items-center">
      <button
        onClick={handlePrevious}
        className="btn-secondary border border-dark-border h-8 px-2 rounded-r-none"
        title="Previous example"
      >
        <VscChevronLeft className="size-4" />
      </button>
      <select
        value={examples[currentIndex].id}
        onChange={handleSelectChange}
        className="btn-secondary text-xs border-y border-dark-border bg-transparent h-8 px-2 cursor-pointer rounded-none appearance-none"
      >
        {examples.map((example) => (
          <option key={example.id} value={example.id}>
            {example.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleNext}
        className="btn-secondary border border-dark-border h-8 px-2 rounded-l-none"
        title="Next example"
      >
        <VscChevronRight className="size-4" />
      </button>
    </div>
  );
}
