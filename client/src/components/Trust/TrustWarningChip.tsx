import React from 'react';
import { AlertTriangle, X, Info, AlertCircle, Ban } from 'lucide-react';
import { cn } from '~/utils';
import type { TrustWarningChipProps } from '~/types/trust-r2';

export default function TrustWarningChip({ 
  warning, 
  onDismiss, 
  className 
}: TrustWarningChipProps) {
  
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          border: 'border-red-300 dark:border-red-700',
          text: 'text-red-800 dark:text-red-200',
          icon: Ban,
          iconColor: 'text-red-600 dark:text-red-400'
        };
      case 'high':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/20',
          border: 'border-orange-300 dark:border-orange-700',
          text: 'text-orange-800 dark:text-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600 dark:text-orange-400'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          border: 'border-yellow-300 dark:border-yellow-700',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: AlertCircle,
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'low':
      default:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          border: 'border-blue-300 dark:border-blue-700',
          text: 'text-blue-800 dark:text-blue-200',
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const getWarningContent = (code: string) => {
    switch (code) {
      case 'DENSITY_SPIKE':
        return {
          title: 'High Activity Detected',
          description: 'Your conversion rate is significantly above normal. This triggers our fraud protection.',
          actionText: 'Activity will be reviewed within 24 hours'
        };
      case 'HIGH_REFUND_RATE':
        return {
          title: 'High Refund Rate',
          description: 'Recent conversions have a higher than normal refund rate.',
          actionText: 'Future earnings may have extended hold periods'
        };
      case 'UNUSUAL_PATTERN':
        return {
          title: 'Unusual Pattern',
          description: 'We\'ve detected some unusual activity patterns in your account.',
          actionText: 'No action needed - monitoring in progress'
        };
      case 'VERIFICATION_NEEDED':
        return {
          title: 'Verification Required',
          description: 'Additional verification is needed to maintain full account access.',
          actionText: 'Complete verification to restore full benefits'
        };
      default:
        return {
          title: 'Account Notice',
          description: warning.message,
          actionText: 'Please review your account activity'
        };
    }
  };

  const config = getSeverityConfig(warning.severity);
  const content = getWarningContent(warning.code);
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-3 rounded-lg border flex items-start gap-3 relative',
      config.bg,
      config.border,
      className
    )}>
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium text-sm', config.text)}>
          {content.title}
        </div>
        <div className={cn('text-xs mt-1', config.text, 'opacity-90')}>
          {content.description}
        </div>
        
        {/* Action required indicator */}
        {warning.action_required && (
          <div className="mt-2">
            <div className={cn(
              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
              warning.severity === 'critical' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' :
              warning.severity === 'high' ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' :
              'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
            )}>
              Action Required
            </div>
            <div className={cn('text-xs mt-1', config.text, 'opacity-80')}>
              {content.actionText}
            </div>
          </div>
        )}

        {/* Resolution steps */}
        {warning.resolution_steps && warning.resolution_steps.length > 0 && (
          <div className="mt-2">
            <div className={cn('text-xs font-medium', config.text)}>
              Next steps:
            </div>
            <ul className={cn('text-xs mt-1 space-y-1', config.text, 'opacity-80')}>
              {warning.resolution_steps.map((step, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="font-medium">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {onDismiss && !warning.action_required && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
            config.text
          )}
          aria-label="Dismiss warning"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
} 