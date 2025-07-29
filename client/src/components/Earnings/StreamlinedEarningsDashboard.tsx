import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Users, Activity, Clock, CheckCircle, DollarSign, Copy, ExternalLink, Settings } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import { TrustBadge } from '~/components/Earnings';
import CashOutModal from './CashOutModal';
import StripeSetupFlow from './StripeSetupFlow';
import ProgressBar from './ProgressBar';
import CircularProgress from './CircularProgress';
import Tooltip from './Tooltip';
import { fetchTrustDiagnostics } from '~/api/trust-r2';
import type { 
  User, 
  EnhancedEarningsStats, 
  PayoutRequest,
  TrustDiagnostics,
  ChatStreakData,
  ReferralInvite
} from '~/types/trust-r2';

interface StreamlinedEarningsDashboardProps {
  user?: User;
  className?: string;
}

// Mock data
const mockEnhancedEarnings: EnhancedEarningsStats = {
  estimated: 26.95,
  confirmed: 42.30,
  paid: 186.45,
  available: 42.30,
  base_earnings: 24.75,
  streak_booster: 2.20,
  booster_percentage: 4.0,
  referral_earnings: 40,
  today: 4.15,
  this_week: 19.65,
  this_month: 69.73,
  lifetime: 294.70,
};

const mockChatStreak: ChatStreakData = {
  streak_days: 8,
  multiplier: 1.04,
  booster_percentage: 4.0,
  next_milestone: 10
};

export default function StreamlinedEarningsDashboard({ user, className }: StreamlinedEarningsDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [earnings, setEarnings] = useState<EnhancedEarningsStats>(mockEnhancedEarnings);
  const [trustDiagnostics, setTrustDiagnostics] = useState<TrustDiagnostics | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const needsStripeSetup = !currentUser?.stripe_account_id;

  useEffect(() => {
    if (!currentUser) {
      setTimeout(() => {
        setCurrentUser({
          id: 'user-123',
          email: 'user@example.com',
          stripe_account_id: 'acct_example123',
          trust_level: 3,
          kyc_status: 'verified',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        });
      }, 500);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !trustDiagnostics) {
      fetchTrustDiagnostics(currentUser.id).then(response => {
        setTrustDiagnostics(response.diagnostics);
      });
    }
  }, [currentUser, trustDiagnostics]);

  const handleGenerateReferralCode = async (): Promise<ReferralInvite> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      code: `ECHO${code}`,
      short_link: `https://echo.ai/r/${code}`,
      current_uses: 0,
      max_uses: 50,
    };
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCashOut = () => {
    if (needsStripeSetup) {
      setShowStripeSetup(true);
    } else {
      setShowCashOutModal(true);
    }
  };

  const handleSubmitPayout = async (request: PayoutRequest): Promise<void> => {
    setIsProcessingPayout(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setEarnings(prev => ({
      ...prev,
      confirmed: prev.confirmed - request.amount,
      available: prev.available - request.amount,
    }));
    setIsProcessingPayout(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (needsStripeSetup && showStripeSetup) {
    return (
      <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-4xl mx-auto">
          <StripeSetupFlow 
            onSetupComplete={() => {
              setCurrentUser(prev => prev ? { ...prev, stripe_account_id: 'acct_new_123' } : null);
              setShowStripeSetup(false);
            }}
            onClose={() => setShowStripeSetup(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Earnings Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Track your Echo earnings with streak bonuses and referrals
            </p>
          </div>
          {currentUser && <TrustBadge level={currentUser.trust_level} size="lg" />}
        </div>

        {/* Stripe Setup Banner */}
        {needsStripeSetup && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Set up payouts to start earning
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  Connect your bank account to receive Echo earnings with streak bonuses
                </p>
              </div>
              <Button 
                onClick={() => setShowStripeSetup(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Set Up Payouts
              </Button>
            </div>
          </div>
        )}

        {/* Main Earnings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estimated Earnings with Boost */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-white">Estimated</span>
                <Tooltip content="Pending conversions with 45-day hold period. Includes your current streak bonus!" />
              </div>
              {earnings.booster_percentage > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium">
                  <Flame className="h-3 w-3" />
                  +{earnings.booster_percentage}%
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earnings.estimated)}
              </div>
              
              {earnings.booster_percentage > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Base: {formatCurrency(earnings.base_earnings)} + Streak: {formatCurrency(earnings.streak_booster)}
                </div>
              )}
              
              <ProgressBar 
                value={earnings.estimated} 
                max={100} 
                color="orange"
                label="Progress to next tier"
                className="mt-4"
              />
            </div>
          </div>

          {/* Available for Payout */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white">Available</span>
              <Tooltip content="Confirmed earnings ready for payout. No hold period." />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earnings.available)}
              </div>
              
              <Button
                onClick={handleCashOut}
                disabled={earnings.available <= 0}
                className="w-full"
                size="lg"
              >
                {needsStripeSetup ? 'Set Up Payouts' : 'Cash Out Now'}
              </Button>
            </div>
          </div>

          {/* Lifetime Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">Lifetime</span>
              <Tooltip content="Total earnings including payouts and referral bonuses" />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earnings.lifetime)}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Paid out: {formatCurrency(earnings.paid)}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Features Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Streak */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Streak</h3>
                <Tooltip content="Daily chat activity boosts your earnings by up to 5%" />
              </div>
              <span className="text-2xl">🔥</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <CircularProgress
                  value={mockChatStreak.streak_days}
                  max={mockChatStreak.next_milestone}
                  color="orange"
                  size={120}
                  label="days"
                />
                <div className="text-center mt-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {mockChatStreak.streak_days} Days
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Current streak
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    +{mockChatStreak.booster_percentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Earnings boost
                  </div>
                </div>

                <div className="space-y-2">
                  <ProgressBar
                    value={mockChatStreak.streak_days}
                    max={mockChatStreak.next_milestone}
                    color="orange"
                    label={`${mockChatStreak.next_milestone - mockChatStreak.streak_days} days to max boost`}
                  />
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Chat daily to maintain your streak and earn bonuses
                </div>
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Referrals</h3>
                <Tooltip content="Earn $10 when friends chat daily for 7 consecutive days" />
              </div>
              <span className="text-2xl">🤝</span>
            </div>

            {trustDiagnostics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {trustDiagnostics.referral_data.qualified_referrals}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Qualified</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {trustDiagnostics.referral_data.pending_referrals}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${trustDiagnostics.referral_data.earnings_referrals}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Earned</div>
                  </div>
                </div>

                <ProgressBar
                  value={trustDiagnostics.referral_data.qualified_referrals}
                  max={trustDiagnostics.referral_data.monthly_limit}
                  color="purple"
                  label={`${trustDiagnostics.referral_data.monthly_limit - trustDiagnostics.referral_data.qualified_referrals} left this month`}
                />

                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      const invite = await handleGenerateReferralCode();
                      handleCopy(invite.short_link, 'referral_link');
                    }}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    {copiedField === 'referral_link' ? (
                      <>Copied!</>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Get Link
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => window.open('mailto:?subject=Join Echo AI&body=Use my referral link to get started with Echo AI!', '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            )}
          </div>
        </div>

        {/* Trust & Activity Metrics */}
        {trustDiagnostics && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trust & Activity</h3>
              <Tooltip content="Your trust score affects revenue share and payout terms" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <CircularProgress
                  value={trustDiagnostics.score}
                  max={100}
                  color="blue"
                  size={80}
                />
                <div className="mt-2">
                  <div className="font-semibold text-gray-900 dark:text-white">Trust Score</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{trustDiagnostics.score}/100</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {trustDiagnostics.multiplier.toFixed(2)}x
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">Revenue Share</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current multiplier</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {(trustDiagnostics.density_metrics.density_coeff).toFixed(1)}x
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">Activity Ratio</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {trustDiagnostics.density_metrics.density_coeff < 3 ? 'Normal' : 'Elevated'}
                </div>
              </div>

              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold mb-2',
                  trustDiagnostics.hard_cut ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                )}>
                  {trustDiagnostics.hard_cut ? 'PAUSED' : 'ACTIVE'}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">Payout Status</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {trustDiagnostics.warnings.length > 0 ? 'Under review' : 'All clear'}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {trustDiagnostics.warnings.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">Account Notice</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {trustDiagnostics.warnings[0].message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Today', amount: earnings.today },
              { label: 'This Week', amount: earnings.this_week },
              { label: 'This Month', amount: earnings.this_month },
              { label: 'All Time', amount: earnings.lifetime },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stat.amount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {!needsStripeSetup && (
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => window.open('https://connect.stripe.com/dashboard', '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Account
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        availableBalance={earnings.available}
        onSubmitPayout={handleSubmitPayout}
        isProcessing={isProcessingPayout}
      />
    </div>
  );
} 