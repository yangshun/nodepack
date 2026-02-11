import { examples } from '../examples';

interface ExampleButtonsProps {
  onSelectExample: (exampleId: string) => void;
}

export function ExampleButtons({ onSelectExample }: ExampleButtonsProps) {
  return (
    <div className="panel mb-6">
      <div className="panel-header">📚 Example Scripts</div>
      <div className="p-4">
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
      </div>
    </div>
  );
}
