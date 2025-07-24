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

  // Parse ad content - expecting format like "Title\n\nDescription"
  const lines = displayContent.split('\n').filter(line => line.trim());
  const title = lines[0] || '';
  const description = lines.slice(1).join(' ') || '';

  const handleClick = () => {
    // Extract link from the original content (not displayContent to get full link even while streaming)
    const linkMatch = content.match(/\[link\](.*?)\[\/link\]/);
    if (linkMatch && linkMatch[1]) {
      const url = linkMatch[1].trim();
      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={cn(
        'my-1 w-fit overflow-hidden rounded-lg transition-all duration-150 ease-out cursor-pointer',
        'border border-brand-purple/30 bg-brand-purple/15 px-3 py-1',
        'dark:border-brand-purple/40 dark:bg-brand-purple/30',
        // Hover effects with smooth transitions
        'hover:bg-brand-purple/20 hover:border-brand-purple/50 hover:shadow-md',
        'dark:hover:bg-brand-purple/40 dark:hover:border-brand-purple/60',
        'transition-colors transition-shadow duration-200 ease-in-out',
        isVisible ? 'animate-fadeGrow opacity-100' : 'max-h-0 opacity-0'
      )}
      role="note"
      aria-label="Sponsored message"
      onClick={handleClick}
    >
      {title && (
        <p className="font-semibold text-brand-purple dark:text-brand-purple/90 text-sm leading-tight">
          {title}
          {showCursor && displayContent === title && (
            <span className="animate-pulse">|</span>
          )}
        </p>
      )}
      
      {description && (
        <p className={cn(
          "text-gray-700 dark:text-gray-300 text-sm leading-tight",
          title ? "mt-0.5" : ""
        )}>
          {description}
          {showCursor && displayContent.endsWith(description) && (
            <span className="animate-pulse">|</span>
          )}
        </p>
      )}
    </div>
  );
});

export default AdTile; 