import React from 'react';
import { Flame, Calendar, TrendingUp, Target } from 'lucide-react';
import { cn } from '~/utils';
import type { ChatStreakDisplayProps } from '~/types/trust-r2';

export default function ChatStreakDisplay({ 
  streak, 
  compact = false, 
  className 
}: ChatStreakDisplayProps) {
  
  const getStreakMilestones = () => {
    return [
      { days: 1, bonus: 0.5, label: 'Day 1' },
      { days: 3, bonus: 1.5, label: '3 Days' },
      { days: 7, bonus: 3.5, label: 'Week' },
      { days: 10, bonus: 5.0, label: 'Max Boost' },
    ];
  };

  const getStreakLevel = (days: number) => {
    if (days >= 10) return { level: 'max', color: 'purple', emoji: '🔥' };
    if (days >= 7) return { level: 'hot', color: 'orange', emoji: '🔥' };
    if (days >= 3) return { level: 'warm', color: 'yellow', emoji: '🌟' };
    if (days >= 1) return { level: 'started', color: 'blue', emoji: '✨' };
    return { level: 'none', color: 'gray', emoji: '💤' };
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'purple':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/20',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-300 dark:border-purple-700',
          accent: 'text-purple-600 dark:text-purple-400'
        };
      case 'orange':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/20',
          text: 'text-orange-700 dark:text-orange-300',
          border: 'border-orange-300 dark:border-orange-700',
          accent: 'text-orange-600 dark:text-orange-400'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-300 dark:border-yellow-700',
          accent: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'blue':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-300 dark:border-blue-700',
          accent: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-300 dark:border-gray-700',
          accent: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const streakLevel = getStreakLevel(streak.streak_days);
  const colors = getColorClasses(streakLevel.color);
  const milestones = getStreakMilestones();

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium', colors.bg, colors.text)}>
          <span className="text-base">{streakLevel.emoji}</span>
          <span>{streak.streak_days} days</span>
          {streak.booster_percentage > 0 && (
            <span className={cn('text-xs', colors.accent)}>
              (+{streak.booster_percentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main streak display */}
      <div className={cn('p-4 rounded-lg border', colors.bg, colors.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{streakLevel.emoji}</div>
            <div>
              <div className={cn('font-semibold', colors.text)}>
                {streak.streak_days} Day Streak
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Daily chat activity
              </div>
            </div>
          </div>
          
          {streak.booster_percentage > 0 && (
            <div className="text-right">
              <div className={cn('text-lg font-bold', colors.accent)}>
                +{streak.booster_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Earnings boost
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress to next milestone */}
      {streak.next_milestone > streak.streak_days && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Next milestone: {streak.next_milestone} days
            </span>
            <span className={colors.accent}>
              {streak.next_milestone - streak.streak_days} days to go
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={cn('h-2 rounded-full transition-all duration-300', 
                streakLevel.color === 'purple' ? 'bg-purple-500' :
                streakLevel.color === 'orange' ? 'bg-orange-500' :
                streakLevel.color === 'yellow' ? 'bg-yellow-500' :
                streakLevel.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500'
              )}
              style={{ 
                width: `${Math.min((streak.streak_days / streak.next_milestone) * 100, 100)}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Milestone breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {milestones.map((milestone, index) => {
          const isAchieved = streak.streak_days >= milestone.days;
          const isCurrent = streak.streak_days < milestone.days && 
                           (index === 0 || streak.streak_days >= milestones[index - 1].days);
          
          return (
            <div
              key={milestone.days}
              className={cn(
                'p-2 rounded text-center text-xs transition-all',
                isAchieved 
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : isCurrent
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
              )}
            >
              <div className="font-medium">{milestone.label}</div>
              <div>+{milestone.bonus}%</div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium mb-1">Keep your streak alive!</p>
            <p className="text-xs">
              Send at least one message daily to maintain your streak and earn up to 5% bonus on all earnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 