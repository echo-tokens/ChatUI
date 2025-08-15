import React from 'react';
import { Clock, Zap, Info } from 'lucide-react';
import { cn } from '~/utils';
import type { PayoutRail } from '~/types/earnings';

const PAYOUT_RAILS: PayoutRail[] = [
  {
    id: 'ach_standard',
    name: 'Bank Transfer (ACH)',
    minimum_amount: 0.01,
    fee_fixed: 0.25,
    fee_percentage: 0,
    description: 'Standard bank transfer to your checking account',
    estimated_time: '1-3 business days',
    recommended_minimum: 1.00,
  },
  {
    id: 'instant_visa_mc',
    name: 'Instant Payout',
    minimum_amount: 0.50,
    fee_fixed: 0.50,
    fee_percentage: 1.5,
    description: 'Instant transfer to your debit card',
    estimated_time: 'Within 30 minutes',
    recommended_minimum: 2.00,
  },
];

interface PayoutRailSelectorProps {
  selectedRail: PayoutRail['id'];
  onSelectRail: (rail: PayoutRail['id']) => void;
  amount: number;
  className?: string;
}

export default function PayoutRailSelector({
  selectedRail,
  onSelectRail,
  amount,
  className
}: PayoutRailSelectorProps) {
  
  const calculateFee = (rail: PayoutRail, amount: number): number => {
    return rail.fee_fixed + (amount * rail.fee_percentage / 100);
  };

  const calculateNet = (rail: PayoutRail, amount: number): number => {
    return Math.max(0, amount - calculateFee(rail, amount));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        Choose Payout Method
      </h3>
      
      {PAYOUT_RAILS.map((rail) => {
        const fee = calculateFee(rail, amount);
        const net = calculateNet(rail, amount);
        const isSelected = selectedRail === rail.id;
        const isDisabled = amount < rail.minimum_amount;
        const isBelowRecommended = amount < rail.recommended_minimum;

        return (
          <div
            key={rail.id}
            className={cn(
              'relative p-4 rounded-lg border cursor-pointer transition-all duration-200',
              isSelected 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
              isDisabled && 'opacity-50 cursor-not-allowed',
              'bg-white dark:bg-gray-800'
            )}
            onClick={() => !isDisabled && onSelectRail(rail.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                )}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {rail.name}
                    </h4>
                    {rail.id === 'instant_visa_mc' && (
                      <Zap className="h-4 w-4 text-yellow-500" />
                    )}
                    {rail.id === 'ach_standard' && (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {rail.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>⏱️ {rail.estimated_time}</span>
                    <span>💰 Min: {formatCurrency(rail.minimum_amount)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Fee:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                    {formatCurrency(fee)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Net:</span>
                  <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(net)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Warnings */}
            {isDisabled && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <Info className="h-4 w-4" />
                  <span className="text-xs">
                    Amount below minimum of {formatCurrency(rail.minimum_amount)}
                  </span>
                </div>
              </div>
            )}
            
            {!isDisabled && isBelowRecommended && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <Info className="h-4 w-4" />
                  <span className="text-xs">
                    Recommended minimum: {formatCurrency(rail.recommended_minimum)} (high fee ratio)
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
          💡 Fee Structure Explanation
        </h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <p>• <strong>Bank Transfer:</strong> Fixed $0.25 fee, great for larger amounts</p>
          <p>• <strong>Instant Payout:</strong> $0.50 + 1.5% fee, best for urgent withdrawals</p>
          <p>• All fees are charged by Stripe and help maintain platform security</p>
        </div>
      </div>
    </div>
  );
} 