import React, { useState } from 'react';
import { Users, Gift, Copy, ExternalLink, Check, Clock, DollarSign } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import type { ReferralCTAProps, ReferralInvite } from '~/types/trust-r2';

export default function ReferralCTA({ 
  referralData, 
  onGenerateCode, 
  className 
}: ReferralCTAProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<ReferralInvite | null>(null);
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const invite = await onGenerateCode();
      setCurrentInvite(invite);
    } catch (error) {
      console.error('Failed to generate referral code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = (invite: ReferralInvite) => {
    const shareText = `Join me on Echo AI! Use my referral code ${invite.code} or click this link: ${invite.short_link}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Echo AI',
        text: shareText,
        url: invite.short_link,
      });
    } else {
      // Fallback to copying
      handleCopy(shareText, 'link');
    }
  };

  const limitRemaining = referralData.monthly_limit - referralData.qualified_referrals;
  const progressPercentage = (referralData.qualified_referrals / referralData.monthly_limit) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Refer Friends
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Earn <strong>$10</strong> when friends chat daily for a week
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            This month: {referralData.qualified_referrals} / {referralData.monthly_limit}
          </span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {limitRemaining} left
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {referralData.qualified_referrals}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Qualified
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {referralData.pending_referrals}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Pending
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${referralData.earnings_referrals}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Earned
          </div>
        </div>
      </div>

      {/* Generate/Display Referral Code */}
      {!currentInvite ? (
        <Button
          onClick={handleGenerateCode}
          disabled={isGenerating || limitRemaining <= 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Clock className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : limitRemaining <= 0 ? (
            'Monthly limit reached'
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Generate Referral Code
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          {/* Referral Code */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your Referral Code
                </div>
                <div className="text-lg font-mono font-bold text-blue-700 dark:text-blue-300">
                  {currentInvite.code}
                </div>
              </div>
              <Button
                onClick={() => handleCopy(currentInvite.code, 'code')}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                {copiedField === 'code' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedField === 'code' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Short Link */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                  Share Link
                </div>
                <div className="text-sm font-mono text-green-700 dark:text-green-300 truncate">
                  {currentInvite.short_link}
                </div>
              </div>
              <div className="flex gap-2 ml-2">
                <Button
                  onClick={() => handleCopy(currentInvite.short_link, 'link')}
                  variant="outline"
                  size="sm"
                >
                  {copiedField === 'link' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => handleShare(currentInvite)}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Share Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleCopy(
                `Join me on Echo AI! Use code ${currentInvite.code} or visit ${currentInvite.short_link}`,
                'link'
              )}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Message
            </Button>
            <Button
              onClick={() => handleShare(currentInvite)}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white mb-2">
            How it works:
          </div>
          <div className="space-y-1 text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span>Friend signs up with your code</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              <span>They chat daily for 7 consecutive days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>You earn $10 credited instantly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning if near limit */}
      {limitRemaining <= 3 && limitRemaining > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Only {limitRemaining} referral{limitRemaining === 1 ? '' : 's'} left this month
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 