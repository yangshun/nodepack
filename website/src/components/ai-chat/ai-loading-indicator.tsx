import { useState, useEffect, useRef, useMemo } from 'react';

const LOADING_WORDS = [
  'Accomplishing',
  'Actioning',
  'Actualizing',
  'Baking',
  'Brewing',
  'Calculating',
  'Cerebrating',
  'Churning',
  'Clauding',
  'Coalescing',
  'Cogitating',
  'Computing',
  'Conjuring',
  'Considering',
  'Cooking',
  'Crafting',
  'Creating',
  'Crunching',
  'Deliberating',
  'Determining',
  'Doing',
  'Effecting',
  'Finagling',
  'Forging',
  'Forming',
  'Generating',
  'Hatching',
  'Herding',
  'Honking',
  'Hustling',
  'Ideating',
  'Inferring',
  'Manifesting',
  'Marinating',
  'Moseying',
  'Mulling',
  'Mustering',
  'Musing',
  'Noodling',
  'Percolating',
  'Pondering',
  'Processing',
  'Puttering',
  'Reticulating',
  'Ruminating',
  'Schlepping',
  'Shucking',
  'Simmering',
  'Smooshing',
  'Spinning',
  'Stewing',
  'Synthesizing',
  'Thinking',
  'Transmuting',
  'Vibing',
  'Working',
];

const CYCLE_INTERVAL_MS = 2000;
const LETTER_INTERVAL_MS = 40;

function shuffleArray<T>(array: Array<T>): Array<T> {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function AILoadingIndicator() {
  const shuffledWords = useMemo(() => shuffleArray(LOADING_WORDS), []);
  const [wordIndex, setWordIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      wordIndexRef.current = (wordIndexRef.current + 1) % shuffledWords.length;
      setWordIndex(wordIndexRef.current);
      setCharCount(0);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(cycleInterval);
  }, [shuffledWords]);

  useEffect(() => {
    const targetLength = shuffledWords[wordIndex].length;

    if (charCount >= targetLength) {
      return;
    }

    const timeout = setTimeout(() => {
      setCharCount((prev) => prev + 1);
    }, LETTER_INTERVAL_MS);

    return () => clearTimeout(timeout);
  }, [wordIndex, charCount]);

  const currentWord = shuffledWords[wordIndex];
  const displayedText = currentWord.slice(0, charCount);
  const remainingText = currentWord.slice(charCount);

  return (
    <div className="text-xs text-gray-400">
      {displayedText}
      <span className="invisible">{remainingText}</span>
      ...
    </div>
  );
}
