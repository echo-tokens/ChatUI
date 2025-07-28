import { memo, useState, useEffect } from 'react';
import { cn } from '~/utils';

interface AdTileProps {
  content: string;
  showCursor: boolean;
}

const AdTile = memo(({ content, showCursor }: AdTileProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate the tile appearance only for new content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Simple content display - extract link and show just the ad text (based on original approach)
  const linkMatch = content.match(/\[link\](.*?)\[\/link\]/);
  const description = content.replace(/\[link\].*?\[\/link\]/g, '').trim();
  const linkUrl = linkMatch && linkMatch[1] ? linkMatch[1].trim() : null;

  const handleClick = () => {
    if (linkUrl) {
      // Ensure URL has protocol (same as previous working implementation)
      const fullUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback for ads without links
      console.log('Ad clicked (no link):', content);
    }
  };

  return (
    <div
      className={cn(
        'my-1 w-fit overflow-hidden rounded-lg transition-all duration-150 ease-out cursor-pointer',
        'border border-brand-purple/10 bg-brand-purple/[0.02] px-3 py-1',
        'dark:border-brand-purple/15 dark:bg-brand-purple/[0.03]',
        // Hover effects with subtle transitions
        'hover:bg-brand-purple/[0.04] hover:border-brand-purple/20 hover:shadow-sm',
        'dark:hover:bg-brand-purple/[0.06] dark:hover:border-brand-purple/25',
        'transition-colors transition-shadow duration-200 ease-in-out',
        isVisible ? 'animate-fadeGrow opacity-100' : 'max-h-0 opacity-0'
      )}
      role="note"
      aria-label="Sponsored message"
      onClick={handleClick}
    >
      {description && (
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-tight">
          {description}
          {showCursor && (
            <span className="animate-pulse">|</span>
          )}
        </p>
      )}
    </div>
  );
});

export default AdTile; 