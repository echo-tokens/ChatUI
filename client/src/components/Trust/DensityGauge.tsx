import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { cn } from '~/utils';
import type { DensityGaugeProps } from '~/types/trust-r2';

export default function DensityGauge({ 
  kappa, 
  className, 
  showTooltip = true 
}: DensityGaugeProps) {
  
  // Calculate gauge metrics
  const getGaugeData = (k: number) => {
    // Optimal range is 0.3 - 3.0 (green zone)
    // Warning range is 3.0 - 10.0 (yellow zone)  
    // Critical range is 10.0+ (red zone)
    
    const normalizedK = Math.log2(Math.max(k, 0.01)); // Prevent log(0)
    const isOptimal = k >= 0.3 && k <= 3.0;
    const isWarning = k > 3.0 && k < 10.0;
    const isCritical = k >= 10.0;
    
    // Calculate fill percentage for visual gauge (0-100%)
    // Map log scale to linear gauge display
    let fillPercentage: number;
    if (k <= 0.1) fillPercentage = 10;
    else if (k <= 0.3) fillPercentage = 20 + (k - 0.1) / 0.2 * 20; // 20-40%
    else if (k <= 1.0) fillPercentage = 40 + (k - 0.3) / 0.7 * 20; // 40-60%
    else if (k <= 3.0) fillPercentage = 60 + (k - 1.0) / 2.0 * 20; // 60-80%
    else if (k <= 10.0) fillPercentage = 80 + (k - 3.0) / 7.0 * 15; // 80-95%
    else fillPercentage = 95 + Math.min((k - 10.0) / 10.0 * 5, 5); // 95-100%
    
    return {
      fillPercentage: Math.min(fillPercentage, 100),
      isOptimal,
      isWarning,
      isCritical,
      color: isCritical ? 'red' : isWarning ? 'yellow' : isOptimal ? 'green' : 'gray',
      label: isCritical ? 'High Risk' : isWarning ? 'Elevated' : isOptimal ? 'Normal' : 'Low Activity'
    };
  };

  const gauge = getGaugeData(kappa);
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          fill: 'bg-green-500',
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-300 dark:border-green-700'
        };
      case 'yellow':
        return {
          fill: 'bg-yellow-500',
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-300 dark:border-yellow-700'
        };
      case 'red':
        return {
          fill: 'bg-red-500',
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-300 dark:border-red-700'
        };
      default:
        return {
          fill: 'bg-gray-500',
          bg: 'bg-gray-100 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-300 dark:border-gray-700'
        };
    }
  };

  const colors = getColorClasses(gauge.color);
  
  const getIcon = () => {
    if (gauge.isCritical) return <AlertTriangle className="h-4 w-4" />;
    if (gauge.isWarning) return <TrendingUp className="h-4 w-4" />;
    if (gauge.isOptimal) return <Activity className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const formatKappa = (k: number) => {
    if (k >= 10) return `${k.toFixed(0)}x`;
    if (k >= 1) return `${k.toFixed(1)}x`;
    return `${k.toFixed(2)}x`;
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">Conversion Density (κ)</div>
      <div className="text-sm">
        <p>Your conversion rate vs. population average</p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>Your ratio:</span>
            <span className="font-medium">{formatKappa(kappa)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={cn('font-medium', colors.text)}>{gauge.label}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            • 0.3x - 3.0x: Normal range<br/>
            • 3.0x - 10x: Elevated (monitored)<br/>
            • 10x+: Flagged for review
          </p>
        </div>
      </div>
    </div>
  );

  if (!showTooltip) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('p-1.5 rounded', colors.bg, colors.text)}>
          {getIcon()}
        </div>
        <span className="text-sm font-medium">{formatKappa(kappa)}</span>
      </div>
    );
  }

  return (
    <div className={cn('group relative', className)}>
      {/* Main gauge display */}
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center gap-2 p-2 rounded-lg border', colors.bg, colors.border)}>
          <div className={colors.text}>
            {getIcon()}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Density</div>
            <div className={cn('text-sm font-semibold', colors.text)}>
              {formatKappa(kappa)}
            </div>
          </div>
        </div>
        
        {/* Visual gauge bar */}
        <div className="flex-1 min-w-16">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={cn('h-2 rounded-full transition-all duration-300', colors.fill)}
              style={{ width: `${gauge.fillPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Low</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        {tooltipContent}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-600" />
      </div>
    </div>
  );
} 