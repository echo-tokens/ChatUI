import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '~/utils';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  showIcon?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({
  content,
  children,
  showIcon = true,
  position = 'top',
  className
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-200',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800 dark:border-b-gray-200',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-800 dark:border-l-gray-200',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-800 dark:border-r-gray-200'
  };

  return (
    <div 
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (showIcon && (
        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
      ))}
      
      {isVisible && (
        <div className={cn(
          'absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-800 rounded-lg shadow-lg max-w-xs',
          positionClasses[position]
        )}>
          {content}
          <div className={cn('absolute w-0 h-0', arrowClasses[position])} />
        </div>
      )}
    </div>
  );
} 