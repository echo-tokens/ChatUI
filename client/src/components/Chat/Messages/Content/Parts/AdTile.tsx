import { memo, useState, useEffect } from 'react';
import { cn } from '~/utils';

interface AdTileProps {
  content: string;
  showCursor: boolean;
}

const AdTile = memo(({ content, showCursor }: AdTileProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayContent, setDisplayContent] = useState('');

  // Animate the tile appearance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Simulate character-by-character streaming of ad content
  useEffect(() => {
    if (!content || !isVisible) {
      return;
    }

    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayContent(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(streamInterval);
      }
    }, 20); // 20ms per character for smooth streaming effect

    return () => clearInterval(streamInterval);
  }, [content, isVisible]);

  // Parse ad content - expecting format like "Title\n\nDescription\n\nCTA"
  const lines = displayContent.split('\n').filter(line => line.trim());
  const title = lines[0] || '';
  const description = lines.slice(1, -1).join(' ') || '';
  const cta = lines[lines.length - 1] || '';

  return (
    <div
      className={cn(
        'mx-auto my-3 w-full max-w-[480px] overflow-hidden rounded-xl transition-all duration-150 ease-out',
        'border border-brand-purple/30 bg-brand-purple/5 px-4 py-3 shadow-sm',
        'dark:border-brand-purple/40 dark:bg-brand-purple/10',
        isVisible ? 'animate-fadeGrow opacity-100' : 'max-h-0 opacity-0'
      )}
      role="note"
      aria-label="Sponsored message"
    >
      {title && (
        <p className="font-semibold text-brand-purple dark:text-brand-purple/90 text-sm mb-2">
          {title}
          {showCursor && displayContent === title && (
            <span className="animate-pulse">|</span>
          )}
        </p>
      )}
      
      {description && (
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 leading-relaxed">
          {description}
          {showCursor && displayContent.endsWith(description) && !cta && (
            <span className="animate-pulse">|</span>
          )}
        </p>
      )}
      
      {cta && (
        <button
          className={cn(
            'inline-block rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-medium text-white',
            'transition-colors hover:bg-brand-purple/90 focus:outline-none focus:ring-2',
            'focus:ring-brand-purple/50 focus:ring-offset-1 dark:focus:ring-offset-gray-800'
          )}
          onClick={() => {
            // TODO: Handle ad click - for now just log
            console.log('Ad clicked:', { title, description, cta });
          }}
        >
          {cta}
          {showCursor && displayContent.endsWith(cta) && (
            <span className="animate-pulse ml-1">|</span>
          )}
        </button>
      )}
    </div>
  );
});

export default AdTile; 