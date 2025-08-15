import React from 'react';
import { cn } from '~/utils';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  showValue?: boolean;
  label?: string;
  className?: string;
}

export default function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  color = 'blue',
  showValue = true,
  label,
  className
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    orange: 'stroke-orange-500',
    purple: 'stroke-purple-500',
    red: 'stroke-red-500'
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('transition-all duration-300', colors[color])}
          />
        </svg>
        
        {/* Center content */}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(percentage)}%
              </div>
              {label && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 