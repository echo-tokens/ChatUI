import React from 'react';
import { DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '~/utils';
import type { UserBalance, EarningsStats } from '~/types/earnings';

interface EarningsCardProps {
  balance: UserBalance;
  stats: EarningsStats;
  isLoading?: boolean;
  className?: string;
}

export default function EarningsCard({ 
  balance, 
  stats, 
  isLoading = false,
  className 
}: EarningsCardProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const balanceItems = [
    {
      label: 'Estimated',
      amount: balance.estimated,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      description: 'Pending conversions (45-day hold)',
    },
    {
      label: 'Available',
      amount: balance.confirmed,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Ready for payout',
    },
    {
      label: 'Paid Out',
      amount: balance.paid,
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Lifetime total received',
    },
  ];

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

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Your Earnings
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {formatCurrency(balance.estimated + balance.confirmed + balance.paid)}
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Stats */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Recent Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Today', amount: stats.today },
            { label: 'This Week', amount: stats.this_week },
            { label: 'This Month', amount: stats.this_month },
            { label: 'Lifetime', amount: stats.lifetime },
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

      {/* Quick Actions */}
      {balance.available > 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {formatCurrency(balance.available)} ready for payout
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Cash out now or let it grow
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-medium">
                Available
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 