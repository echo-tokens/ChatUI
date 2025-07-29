import React from 'react';
import { Shield, Info } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import type { TrustLevel } from '~/types/earnings';

const TRUST_LEVELS: TrustLevel[] = [
  {
    level: 1,
    name: 'New User',
    color: 'bg-gray-500',
    description: 'Welcome to Echo! Start earning by engaging with quality ads.',
    benefits: ['Base 70% revenue share', '$5 minimum payout', '$200 daily limit'],
  },
  {
    level: 2,
    name: 'Active',
    color: 'bg-blue-500',
    description: 'Consistent engagement with quality conversions.',
    benefits: ['75% revenue share', '$3 minimum payout', '$300 daily limit'],
    requirements: ['$10+ total earnings', '5+ successful conversions'],
  },
  {
    level: 3,
    name: 'Trusted',
    color: 'bg-green-500',
    description: 'Verified user with excellent engagement patterns.',
    benefits: ['85% revenue share', '$2 minimum payout', '$500 daily limit'],
    requirements: ['$50+ total earnings', 'KYC verified', '20+ conversions'],
  },
  {
    level: 4,
    name: 'Elite',
    color: 'bg-purple-500',
    description: 'Top-tier user with premium access and faster payouts.',
    benefits: ['90% revenue share', '$1 minimum payout', '$1000 daily limit', 'Priority support'],
    requirements: ['$200+ total earnings', 'Advanced KYC', '50+ conversions'],
  },
  {
    level: 5,
    name: 'Partner',
    color: 'bg-orange-500',
    description: 'Elite partner with maximum benefits and instant payouts.',
    benefits: ['95% revenue share', 'No minimum payout', 'Unlimited daily limit', 'Instant payouts', 'Direct partner contact'],
    requirements: ['$1000+ total earnings', 'Enterprise KYC', '200+ conversions'],
  },
];

interface TrustBadgeProps {
  level: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TrustBadge({ 
  level, 
  showTooltip = true, 
  size = 'md',
  className 
}: TrustBadgeProps) {
  const trustLevel = TRUST_LEVELS.find(t => t.level === level) || TRUST_LEVELS[0];
  
  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-10 px-4 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  if (!showTooltip) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 rounded-full text-white font-medium',
        trustLevel.color,
        sizeClasses[size],
        className
      )}>
        <Shield className={iconSizes[size]} />
        <span>Level {level}</span>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className={cn(
        'inline-flex items-center gap-1.5 rounded-full text-white font-medium cursor-help',
        trustLevel.color,
        sizeClasses[size],
        className
      )}>
        <Shield className={iconSizes[size]} />
        <span>Level {level}</span>
        <Info className={cn(iconSizes[size], 'opacity-70')} />
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-3 h-3 rounded-full', trustLevel.color)} />
            <span className="font-semibold text-gray-900 dark:text-white">
              {trustLevel.name}
            </span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {trustLevel.description}
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Benefits:</h4>
            <ul className="space-y-1">
              {trustLevel.benefits.map((benefit, index) => (
                <li key={index} className="text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full" />
                  {benefit}
                </li>
              ))}
            </ul>
            
            {trustLevel.requirements && (
              <>
                <h4 className="font-medium text-gray-900 dark:text-white mt-3">
                  {level <= 1 ? 'Next Level Requirements:' : 'Requirements Met:'}
                </h4>
                <ul className="space-y-1">
                  {trustLevel.requirements.map((req, index) => (
                    <li key={index} className="text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1">
                      <span className="w-1 h-1 bg-blue-500 rounded-full" />
                      {req}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-600" />
      </div>
    </div>
  );
} 