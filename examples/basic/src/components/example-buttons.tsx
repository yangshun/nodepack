import { examples } from '../examples';

interface ExampleButtonsProps {
  onSelectExample: (exampleId: string) => void;
}

export function ExampleButtons({ onSelectExample }: ExampleButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <button
          key={example.id}
          onClick={() => onSelectExample(example.id)}
          className="btn-secondary"
        >
          {example.label}
        </button>
      ))}
    </div>
  );
}
