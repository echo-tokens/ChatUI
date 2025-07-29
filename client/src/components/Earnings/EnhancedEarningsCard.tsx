import React from 'react';
import { DollarSign, Clock, CheckCircle, TrendingUp, Flame, Zap } from 'lucide-react';
import { cn } from '~/utils';
import { ChatStreakDisplay } from '~/components/Trust';
import type { EnhancedEarningsStats, ChatStreakData } from '~/types/trust-r2';

interface EnhancedEarningsCardProps {
  earnings: EnhancedEarningsStats;
  streak?: ChatStreakData;
  isLoading?: boolean;
  className?: string;
}

export default function EnhancedEarningsCard({ 
  earnings, 
  streak,
  isLoading = false,
  className 
}: EnhancedEarningsCardProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
        className
      )}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const balanceItems = [
    {
      label: 'Estimated',
      amount: earnings.estimated,
      baseAmount: earnings.base_earnings,
      booster: earnings.streak_booster,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      description: 'Pending conversions (45-day hold)',
      showBooster: true,
    },
    {
      label: 'Available',
      amount: earnings.confirmed,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Ready for payout',
      showBooster: false,
    },
    {
      label: 'Paid Out',
      amount: earnings.paid,
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Lifetime total received',
      showBooster: false,
    },
  ];

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Your Earnings
          {earnings.booster_percentage > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium">
              <Flame className="h-3 w-3" />
              +{earnings.booster_percentage.toFixed(1)}%
            </span>
          )}
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {formatCurrency(earnings.estimated + earnings.confirmed + earnings.paid)}
        </div>
      </div>

      {/* Main Balance Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {balanceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                'p-4 rounded-lg border',
                item.bgColor,
                'border-gray-200 dark:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('p-2 rounded-lg', item.bgColor)}>
                  <Icon className={cn('h-4 w-4', item.color)} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </p>
                  {item.showBooster && earnings.booster_percentage > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                      <Zap className="h-3 w-3" />
                      +{earnings.booster_percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
                
                {/* Booster breakdown */}
                {item.showBooster && item.booster && item.booster > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Base: {formatCurrency(item.baseAmount || 0)} + Streak: {formatCurrency(item.booster)}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak Display */}
      {streak && streak.streak_days > 0 && (
        <div className="mb-6">
          <ChatStreakDisplay streak={streak} compact={true} />
        </div>
      )}

      {/* Enhanced Stats */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Recent Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Today', amount: earnings.today },
            { label: 'This Week', amount: earnings.this_week },
            { label: 'This Month', amount: earnings.this_month },
            { label: 'Lifetime', amount: earnings.lifetime },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stat.amount)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Earnings */}
      {earnings.referral_earnings > 0 && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Referral bonuses: {formatCurrency(earnings.referral_earnings)}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                From qualified friend referrals
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booster Explanation */}
      {earnings.booster_percentage > 0 && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Daily streak bonus active!
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                You're earning {earnings.booster_percentage.toFixed(1)}% extra on all conversions thanks to your {streak?.streak_days || 0}-day chat streak.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Booster Milestone */}
      {streak && streak.next_milestone > streak.streak_days && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Next milestone: {streak.next_milestone} days
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {streak.next_milestone - streak.streak_days} more days for max 5% bonus
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                +{((streak.next_milestone === 10 ? 5.0 : 3.5)).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 