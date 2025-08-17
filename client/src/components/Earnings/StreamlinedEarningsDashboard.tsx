import React, { useState, useEffect } from 'react';
import { Plus, Settings, ExternalLink, RefreshCw, Shield, Info, Copy, Check, Flame, Users, TrendingUp, Database, Clock, CheckCircle, DollarSign, Activity } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import EnhancedEarningsCard from './EnhancedEarningsCard';
import TransactionTable from './TransactionTable';
import CashOutModal from './CashOutModal';
import TrustBadge from './TrustBadge';
import StripeSetupFlow from './StripeSetupFlow';
import { TrustDiagnosticsPanel } from '~/components/Trust';
import { TrustWarningChip } from '~/components/Trust';
import { DensityGauge } from '~/components/Trust';
import ProgressBar from './ProgressBar';
import CircularProgress from './CircularProgress';
import Tooltip from './Tooltip';
import {
  fetchTrustDiagnostics,
  fetchEnhancedEarnings,
  generateReferralCode,
  recordUserChatActivity,
  subscribeTrustUpdates
} from '~/api/trust-r2';
import type {
  User,
  PayoutRequest,
  TrustDiagnostics,
  EnhancedEarningsStats,
  ChatStreakData,
  ReferralInvite
} from '~/types/trust-r2';

interface StreamlinedEarningsDashboardProps {
  user?: User;
  className?: string;
}

export default function StreamlinedEarningsDashboard({ user, className }: StreamlinedEarningsDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [earnings, setEarnings] = useState<EnhancedEarningsStats | null>(null);
  const [trustDiagnostics, setTrustDiagnostics] = useState<TrustDiagnostics | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'mock'>('checking');

  const needsStripeSetup = !currentUser?.stripe_account_id;

  useEffect(() => {
    // Initialize user if not provided
    if (!currentUser) {
      setTimeout(() => {
        setCurrentUser({
          id: 'user-123',
          email: 'user@example.com',
          stripe_account_id: 'acct_example123', // Simulate connected Stripe
          trust_level: 3,
          kyc_status: 'verified',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        });
      }, 500);
    }
  }, [currentUser]);

  useEffect(() => {
    // Load trust diagnostics and earnings from Supabase
    if (currentUser) {
      const loadData = async () => {
        setIsLoading(true);

        try {
          console.log('Loading dashboard data for user:', currentUser.id);
          
          // Load trust diagnostics
          const trustResponse = await fetchTrustDiagnostics(currentUser.id);
          console.log('Trust diagnostics response:', trustResponse);
          setTrustDiagnostics(trustResponse.diagnostics);

          // Load enhanced earnings
          const earningsData = await fetchEnhancedEarnings(currentUser.id);
          console.log('Earnings data response:', earningsData);
          setEarnings(earningsData);

          // Record chat activity for this session
          await recordUserChatActivity(currentUser.id);
          
          // Update connection status based on data source
          if (trustResponse.diagnostics && earningsData && typeof earningsData === 'object' && 'estimated' in earningsData) {
            setDbConnectionStatus('connected');
          } else {
            setDbConnectionStatus('mock');
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          setDbConnectionStatus('mock');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    // Subscribe to real-time trust updates
    if (currentUser) {
      const unsubscribe = subscribeTrustUpdates(currentUser.id, (updatedDiagnostics) => {
        setTrustDiagnostics(updatedDiagnostics);
        
        // Update earnings with new booster data if changed
        if (earnings && updatedDiagnostics.chat_streak.booster_percentage !== earnings.booster_percentage) {
          setEarnings(prev => prev ? {
            ...prev,
            booster_percentage: updatedDiagnostics.chat_streak.booster_percentage,
            streak_booster: prev.base_earnings * (updatedDiagnostics.chat_streak.booster_percentage / 100),
          } : null);
        }
      });

      return unsubscribe;
    }
  }, [currentUser, earnings]);

  const handleGenerateReferralCode = async (): Promise<ReferralInvite> => {
    if (!currentUser) throw new Error('No user');
    
    const response = await generateReferralCode(currentUser.id);
    return response.invite;
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
    
    if (earnings) {
      setEarnings(prev => prev ? {
        ...prev,
        confirmed: prev.confirmed - request.amount,
        available: prev.available - request.amount,
      } : null);
    }
    setIsProcessingPayout(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getDbStatusIcon = () => {
    switch (dbConnectionStatus) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />;
      case 'connected':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <Database className="h-4 w-4 text-red-500" />;
      case 'mock':
        return <Database className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getDbStatusText = () => {
    switch (dbConnectionStatus) {
      case 'checking':
        return 'Checking database...';
      case 'connected':
        return 'Database connected';
      case 'disconnected':
        return 'Database disconnected (using fallback)';
      case 'mock':
        return 'Using mock data';
    }
  };

  // Loading state
  if (isLoading || !earnings || !trustDiagnostics) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-6xl mx-auto min-h-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Stripe setup if needed
  if (needsStripeSetup && showStripeSetup) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-4xl mx-auto min-h-full">
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
    <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-6xl mx-auto p-6 space-y-6 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Earnings & Trust</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Monitor your Echo earnings, trust level, and engagement.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Database Connection Status */}
            <Tooltip content={getDbStatusText()}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {getDbStatusIcon()}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {dbConnectionStatus === 'connected' ? 'Live' : dbConnectionStatus === 'mock' ? 'Demo' : 'Offline'}
                </span>
              </div>
            </Tooltip>
            
            {currentUser && (
              <Tooltip content={`Your current trust level: ${currentUser.trust_level}. Higher levels unlock better benefits.`}>
                <TrustBadge level={currentUser.trust_level} size="lg" />
              </Tooltip>
            )}
            <Button
              onClick={() => { /* Refresh logic handled by useEffect and Supabase */ }}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh Data
            </Button>
          </div>
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
                  value={trustDiagnostics.chat_streak.streak_days}
                  max={trustDiagnostics.chat_streak.next_milestone}
                  color="orange"
                  size={120}
                  label="days"
                />
                <div className="text-center mt-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {trustDiagnostics.chat_streak.streak_days} Days
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Current streak
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    +{trustDiagnostics.chat_streak.booster_percentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Earnings boost
                  </div>
                </div>

                <div className="space-y-2">
                  <ProgressBar
                    value={trustDiagnostics.chat_streak.streak_days}
                    max={trustDiagnostics.chat_streak.next_milestone}
                    color="orange"
                    label={`${trustDiagnostics.chat_streak.next_milestone - trustDiagnostics.chat_streak.streak_days} days to max boost`}
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
                    try {
                      const invite = await handleGenerateReferralCode();
                      handleCopy(invite.short_link, 'referral_link');
                    } catch (error) {
                      console.error('Failed to generate referral code:', error);
                    }
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
                  onClick={() => window.open('mailto:?subject=Join Echo LLM&body=Use my referral link to get started with Echo LLM!', '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Activity Metrics */}
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
                {trustDiagnostics.density_metrics.density_coeff.toFixed(1)}x
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