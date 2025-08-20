import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, RefreshCw, Copy, Flame, Users, Clock, CheckCircle, DollarSign, Activity } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import CashOutModal from './CashOutModal';
import StripeSetupFlow from './StripeSetupFlow';
import ProgressBar from './ProgressBar';
import Tooltip from './Tooltip';
import { fetchUserInfo } from '~/api/trust-r2';
import { useAuthContext } from '~/hooks/AuthContext';
import type {
  User,
  PayoutRequest,
  UserInfoResponse
} from '~/types/trust-r2';

interface StreamlinedEarningsDashboardProps {
  user?: User;
  className?: string;
}

export default function StreamlinedEarningsDashboard({ user, className }: StreamlinedEarningsDashboardProps) {
  const { token } = useAuthContext();
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const needsStripeSetup = !currentUser?.stripe_account_id;

  useEffect(() => {
    // Load user data from AccountManagement service
    if (currentUser && token) {
      const loadData = async () => {
        setIsLoading(true);
        setError(null);

        try {
          console.log('Loading user data for:', currentUser.id);
          const data = await fetchUserInfo(currentUser.id, token);
          console.log('User info response:', data);
          
          // Check if this is mock data
          if (data._mock) {
            setError(data._message || "Using demo data - Account Management service is temporarily unavailable");
          }
          
          setUserInfo(data);
        } catch (error) {
          console.error('Error loading user data:', error);
          let errorMessage = "Can't connect to Earnings server";
          if (error instanceof Error) {
            // Show more specific error messages
            if (error.message.includes('Account Management service')) {
              errorMessage = error.message;
            } else if (error.message.includes('Failed to connect')) {
              errorMessage = "Can't connect to Earnings server. Please check if the service is running.";
            } else if (error.message && !error.message.includes('Failed to fetch')) {
              errorMessage = error.message;
            }
          }
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, [currentUser, token]);

  const handleRefresh = async () => {
    if (currentUser && token) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchUserInfo(currentUser.id, token);
        setUserInfo(data);
      } catch (error) {
        console.error('Error refreshing user data:', error);
        let errorMessage = "Can't connect to Earnings server";
        if (error instanceof Error) {
          // Show more specific error messages
          if (error.message.includes('Account Management service')) {
            errorMessage = error.message;
          } else if (error.message.includes('Failed to connect')) {
            errorMessage = "Can't connect to Earnings server. Please check if the service is running.";
          } else if (error.message && !error.message.includes('Failed to fetch')) {
            errorMessage = error.message;
          }
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
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
    
    if (userInfo) {
      setUserInfo(prev => prev ? {
        ...prev,
        task_earnings: {
          ...prev.task_earnings,
          confirmed_earnings: prev.task_earnings.confirmed_earnings - request.amount,
          paid_earnings: prev.task_earnings.paid_earnings + request.amount,
        }
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


  // Error state - but continue showing page if it's just mock data
  if (error && !userInfo) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-6xl mx-auto min-h-full">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Connection Error
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !userInfo) {
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
        {/* Warning banner for mock data */}
        {error && userInfo && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-800 dark:text-yellow-200 font-medium">Demo Mode</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {error}
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Earnings & Trust</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Monitor your Echo earnings, trust level, and engagement.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {userInfo && (
              <Tooltip content={`Your trust level: ${userInfo.trust.trust_level}. Change: ${userInfo.trust.change_in_trust > 0 ? '+' : ''}${userInfo.trust.change_in_trust}`}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Trust: {userInfo.trust.trust_level}
                  </div>
                  {userInfo.trust.change_in_trust !== 0 && (
                    <div className={cn(
                      "text-xs px-1 py-0.5 rounded",
                      userInfo.trust.change_in_trust > 0 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    )}>
                      {userInfo.trust.change_in_trust > 0 ? '+' : ''}{userInfo.trust.change_in_trust}
                    </div>
                  )}
                </div>
              </Tooltip>
            )}
            <Button
              onClick={handleRefresh}
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
          {/* Pending Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-white">Pending</span>
              <Tooltip content="Earnings pending confirmation. Subject to review period." />
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {userInfo ? formatCurrency(userInfo.task_earnings.pending_earnings) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Available for Payout */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white">Available</span>
              <Tooltip content="Confirmed earnings ready for payout." />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {userInfo ? formatCurrency(userInfo.task_earnings.confirmed_earnings) : 'N/A'}
              </div>
              
              <Button
                onClick={handleCashOut}
                disabled={!userInfo || userInfo.task_earnings.confirmed_earnings <= 0}
                className="w-full"
                size="lg"
              >
                {needsStripeSetup ? 'Set Up Payouts' : 'Cash Out Now'}
              </Button>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">Total</span>
              <Tooltip content="Total lifetime earnings including payouts" />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {userInfo ? formatCurrency(userInfo.task_earnings.total_earnings) : 'N/A'}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Paid out: {userInfo ? formatCurrency(userInfo.task_earnings.paid_earnings) : 'N/A'}
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
                <Tooltip content="Daily chat activity helps build your engagement score" />
              </div>
              <span className="text-2xl">🔥</span>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {userInfo ? userInfo.chat_streak : 'N/A'}
              </div>
              <div className="text-lg text-gray-600 dark:text-gray-400">
                Days Active
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                💡 Keep chatting daily to maintain your streak
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Referrals</h3>
                <Tooltip content="Earn money by referring friends to Echo" />
              </div>
              <span className="text-2xl">🤝</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {userInfo ? userInfo.referral_data.approved_referrals : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Approved</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {userInfo ? userInfo.referral_data.sent_out_referrals : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Sent</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {userInfo ? formatCurrency(userInfo.referral_data.referral_earnings) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Earned</div>
                </div>
              </div>

              {userInfo && (
                <ProgressBar
                  value={userInfo.referral_data.sent_out_referrals}
                  max={userInfo.referral_data.max_referrals}
                  color="purple"
                  label={`${userInfo.referral_data.max_referrals - userInfo.referral_data.sent_out_referrals} remaining`}
                />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => userInfo && handleCopy(userInfo.referral_data.referral_code, 'referral_code')}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  disabled={!userInfo}
                >
                  {copiedField === 'referral_code' ? (
                    <>Copied!</>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code: {userInfo ? userInfo.referral_data.referral_code : 'N/A'}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => userInfo && window.open(`mailto:?subject=Join Echo LLM&body=Use my referral code ${userInfo.referral_data.referral_code} to get started with Echo LLM!`, '_blank')}
                  variant="outline"
                  size="sm"
                  disabled={!userInfo}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Overview</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {userInfo ? userInfo.trust.trust_level : 'N/A'}
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">Trust Level</div>
              {userInfo && userInfo.trust.change_in_trust !== 0 && (
                <div className={cn(
                  "text-sm mt-1",
                  userInfo.trust.change_in_trust > 0 
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {userInfo.trust.change_in_trust > 0 ? '+' : ''}{userInfo.trust.change_in_trust} recent
                </div>
              )}
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {userInfo ? userInfo.chat_streak : 'N/A'}
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">Chat Streak</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Days active</div>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {userInfo ? userInfo.referral_data.approved_referrals : 'N/A'}
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">Referrals</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                ACTIVE
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">Account Status</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">All systems normal</div>
            </div>
          </div>
        </div>

        {/* Recent Earnings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Earnings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'This Week', amount: userInfo ? userInfo.task_earnings.earnings_week : 0 },
              { label: 'This Month', amount: userInfo ? userInfo.task_earnings.earnings_month : 0 },
              { label: 'All Time', amount: userInfo ? userInfo.task_earnings.total_earnings : 0 },
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
        availableBalance={userInfo?.task_earnings.confirmed_earnings || 0}
        onSubmitPayout={handleSubmitPayout}
        isProcessing={isProcessingPayout}
      />
    </div>
  );
} 