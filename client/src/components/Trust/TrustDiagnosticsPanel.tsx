import React, { useState } from 'react';
import { Shield, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import { TrustBadge } from '~/components/Earnings';
import DensityGauge from './DensityGauge';
import ChatStreakDisplay from './ChatStreakDisplay';
import ReferralCTA from './ReferralCTA';
import TrustWarningChip from './TrustWarningChip';
import type { TrustDiagnosticsPanelProps, ReferralInvite } from '~/types/trust-r2';

export default function TrustDiagnosticsPanel({
  diagnostics,
  isLoading = false,
  onRefresh,
  className
}: TrustDiagnosticsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  const handleDismissWarning = (warningCode: string) => {
    setDismissedWarnings(prev => new Set([...prev, warningCode]));
  };

  const handleGenerateReferralCode = async (): Promise<ReferralInvite> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      code: `ECHO${code}`,
      short_link: `https://echo.ai/r/${code}`,
      current_uses: 0,
      max_uses: 50,
    };
  };

  const visibleWarnings = diagnostics.warnings.filter(
    warning => !dismissedWarnings.has(warning.code)
  );

  const hasActiveWarnings = visibleWarnings.length > 0;
  const isCritical = diagnostics.hard_cut || visibleWarnings.some(w => w.severity === 'critical');

  if (isLoading) {
    return (
      <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trust Diagnostics
            </h2>
            <TrustBadge level={diagnostics.level} size="md" showTooltip={false} />
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            )}
            
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <span>Details</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Trust Score Overview */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {diagnostics.score}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Trust Score
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {diagnostics.multiplier.toFixed(2)}x
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Revenue Multiplier
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={cn(
              'text-2xl font-bold',
              isCritical ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            )}>
              {isCritical ? 'PAUSED' : 'ACTIVE'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Payout Status
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {hasActiveWarnings && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            {visibleWarnings.map((warning) => (
              <TrustWarningChip
                key={warning.code}
                warning={warning}
                onDismiss={warning.severity === 'low' ? () => handleDismissWarning(warning.code) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Metrics */}
      <div className="p-6 space-y-6">
        {/* Conversion Density */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Conversion Density</h3>
            <Info className="h-4 w-4 text-gray-400" />
          </div>
          <DensityGauge 
            kappa={diagnostics.density_metrics.density_coeff}
            showTooltip={true}
          />
        </div>

        {/* Chat Streak */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Chat Streak</h3>
          <ChatStreakDisplay 
            streak={diagnostics.chat_streak}
            compact={false}
          />
        </div>

        {/* Referral System */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Referrals</h3>
          <ReferralCTA 
            referralData={diagnostics.referral_data}
            onGenerateCode={handleGenerateReferralCode}
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            Score Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(diagnostics.subscores).map(([key, value]) => {
              const label = key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              
              return (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{label}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                </div>
              );
            })}
          </div>

          {/* Technical Details */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Technical Metrics
            </h4>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <div>Density Coefficient (κ): {diagnostics.density_metrics.density_coeff.toFixed(3)}</div>
              <div>24h Peak Density: {diagnostics.density_metrics.kappa_24h.toFixed(3)}</div>
              <div>Conversion Density Score: {diagnostics.density_metrics.conv_density_sub}/100</div>
              <div>Streak Multiplier: {diagnostics.chat_streak.multiplier.toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 