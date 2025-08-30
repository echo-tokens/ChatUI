import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, RefreshCw, Copy, Users, Clock, CheckCircle, DollarSign, Activity, Calendar } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import CashOutModal from './CashOutModal';
import ProgressBar from './ProgressBar';
import Tooltip from './Tooltip';
import { fetchUserInfo } from '~/api/trust-r2';
import { useAuthContext } from '~/hooks/AuthContext';
import { request } from 'librechat-data-provider';
import type {
  User,
  PayoutRequest,
  UserInfoResponse
} from '~/types/trust-r2';

interface StreamlinedEarningsDashboardProps {
  user?: User;
  className?: string;
}

// Function to map weekly earnings history from user data
const generateWeeklyEarningsHistory = (userInfo: UserInfoResponse | null) => {
  if (!userInfo) return [];
  
  return userInfo.task_earnings.weekly_payouts.map((weekData) => {
    const weekStart = new Date(weekData.week_start);
    const weekEnd = new Date(weekData.week_end);
    
    return {
      week: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      earnings: weekData.paid_out_earnings
    };
  });
};

export default function StreamlinedEarningsDashboard({ user, className }: StreamlinedEarningsDashboardProps) {
  const { token } = useAuthContext();
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [transferMessage, setTransferMessage] = useState<string>('');
  const [stripeConnectionStatus, setStripeConnectionStatus] = useState<'loading' | 'connected' | 'not_connected'>('loading');

  const needsStripeSetup = stripeConnectionStatus === 'not_connected';

  // Function to redirect to Stripe OAuth
  const redirectToStripeOAuth = () => {
    const prefix = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const STRIPE_CLIENT_ID = import.meta.env.VITE_STRIPE_CLIENT_ID;
    const stripe_url = `${prefix}connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=read_write&state=${token}&redirect_uri=${prefix}${window.location.host}/earnings/stripe-confirmation`;
    window.open(stripe_url, '_blank')?.focus();
  };

  // Function to check Stripe connection status
  const checkStripeConnection = async () => {
    if (!currentUser?.id || !token) return;

    try {
      const data = await request.get(`/api/stripe/has-connected-account/${currentUser.id}`) as any;
      setStripeConnectionStatus(data.has_connected_account ? 'connected' : 'not_connected');
    } catch (error) {
      console.error('Error checking Stripe connection:', error);
      setStripeConnectionStatus('not_connected');
    }
  };

  useEffect(() => {
    // Check Stripe connection status on load
    checkStripeConnection();
  }, [currentUser?.id, token]);

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
          
          // Check if this is mock data (handle any mock indicators from the API)
          if ((data as any)._mock) {
            setError((data as any)._message || "Using demo data - Account Management service is temporarily unavailable");
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
        // Also refresh Stripe connection status
        await checkStripeConnection();
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

  const handleCashOut = async () => {
    if (needsStripeSetup) {
      redirectToStripeOAuth();
      return;
    }

    if (!userInfo?.user_id || !token) {
      setTransferStatus('error');
      setTransferMessage('User not authenticated');
      return;
    }

    setIsProcessingPayout(true);
    setTransferStatus('idle');
    setTransferMessage('');

    try {
      console.log('Initiating payout for user:', userInfo.user_id);
      const data = await request.post('/api/stripe/transfer-payout', {
        user_id: userInfo.user_id
      }) as any;

      setTransferStatus('success');
      setTransferMessage(`Successfully initiated transfer!`);

      // Refresh user data to show updated earnings
      await handleRefresh();
    } catch (error) {
      console.error('Error processing payout:', error);
      setTransferStatus('error');
      setTransferMessage('Network error occurred while processing payout');
    } finally {
      setIsProcessingPayout(false);
    }
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

  return (
    <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-6xl mx-auto p-6 space-y-4 min-h-full">
        {/* Warning banner for mock data */}
        {error && userInfo && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
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
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Earnings</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor your Echo earnings and engagement.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                if (stripeConnectionStatus === 'loading') return;
                if (needsStripeSetup) {
                  redirectToStripeOAuth();
                } else {
                  window.open('https://connect.stripe.com/dashboard', '_blank');
                }
              }}
              variant={needsStripeSetup ? "default" : "outline"}
              size="sm"
              disabled={stripeConnectionStatus === 'loading'}
              className={cn(
                needsStripeSetup && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {stripeConnectionStatus === 'loading' ? 'Loading...' : (needsStripeSetup ? "Connect Stripe" : "Stripe Dashboard")}
            </Button>
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
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Set up payouts via Stripe to start earning
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  Connect your bank account to receive Echo earnings
                </p>
              </div>
              <Button 
                onClick={redirectToStripeOAuth}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect Stripe
              </Button>
            </div>
          </div>
        )}

        {/* Earned All-Time Amount - Above Tile */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Claimed Earnings</div>
            <div className="text-6xl font-bold text-gray-900 dark:text-white">
              {userInfo ? formatCurrency(userInfo.task_earnings.paid_out_earnings) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Earnings Status Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-white text-sm">Pending Earnings</span>
            </div>
            <div className="space-y-1 mt-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userInfo ? formatCurrency(userInfo.task_earnings.unpaid_pending_earnings) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Under review</div>
            </div>
          </div>

          {/* Approved Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white text-sm">Approved Earnings</span>
            </div>
            <div className="space-y-3 mt-3">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userInfo ? formatCurrency(userInfo.task_earnings.unpaid_approved_earnings) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Available to collect</div>
              </div>
              {(() => {
                const isDisabled = !userInfo || userInfo.task_earnings.unpaid_approved_earnings < 10 || needsStripeSetup;
                const getTooltipText = () => {
                  if (needsStripeSetup) {
                    return 'Connect Stripe to collect';
                  }
                  if (userInfo && userInfo.task_earnings.unpaid_approved_earnings < 10) {
                    return 'Minimum $10 payout';
                  }
                  return '';
                };

                const isEnabled = userInfo && userInfo.task_earnings.unpaid_approved_earnings >= 10 && !needsStripeSetup;
                
                const button = (
                  <div className="w-full">
                    <Button
                      onClick={isEnabled ? handleCashOut : () => {
                        if (needsStripeSetup) {
                          redirectToStripeOAuth();
                        }
                      }}
                      disabled={isDisabled || isProcessingPayout}
                      className={cn(
                        "w-full min-w-full",
                        isEnabled 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
                      )}
                      size="sm"
                      style={{ width: '100%' }}
                    >
                      {isProcessingPayout ? 'Processing...' : (needsStripeSetup ? 'Connect Stripe' : 'Collect')}
                    </Button>
                  </div>
                );

                if (isDisabled && getTooltipText()) {
                  return (
                    <Tooltip className="w-full" content={getTooltipText()}>
                      {button}
                    </Tooltip>
                  );
                }

                return button;
              })()}
            </div>
          </div>
        </div>

        {/* Transfer Status Display */}
        {transferStatus !== 'idle' && (
          <div className={cn(
            "rounded-lg p-4 border",
            transferStatus === 'success' 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-3">
              {transferStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div>
                <h3 className={cn(
                  "font-medium",
                  transferStatus === 'success' 
                    ? "text-green-900 dark:text-green-100" 
                    : "text-red-900 dark:text-red-100"
                )}>
                  {transferStatus === 'success' ? 'Transfer Successful' : 'Transfer Failed'}
                </h3>
                <p className={cn(
                  "text-sm",
                  transferStatus === 'success' 
                    ? "text-green-700 dark:text-green-300" 
                    : "text-red-700 dark:text-red-300"
                )}>
                  {transferMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Task Status Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-white text-sm">Pending Tasks</span>
            </div>
            <div className="space-y-1 mt-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userInfo ? userInfo.task_earnings.unpaid_pending_tasks > 0 ? userInfo.task_earnings.unpaid_pending_tasks : '0' : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Awaiting review</div>
            </div>
          </div>

          {/* Approved Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white text-sm">Approved Tasks</span>
            </div>
            <div className="space-y-1 mt-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userInfo ? userInfo.task_earnings.unpaid_approved_tasks > 0 ? userInfo.task_earnings.unpaid_approved_tasks : '0' : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Ready for payout</div>
            </div>
          </div>

          {/* Rejected Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="font-medium text-gray-900 dark:text-white text-sm">Rejected Tasks</span>
            </div>
            <div className="space-y-1 mt-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userInfo ? '0' : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Not approved</div>
            </div>
          </div>
        </div>

        {/* Weekly Earnings History and Referrals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly Earnings History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Payout History</h3>
            </div>
            
                          <div className="max-h-64 overflow-y-auto space-y-2">
                {generateWeeklyEarningsHistory(userInfo).map((week, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {week.week}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {formatCurrency(week.earnings)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Referrals</h3>
              <Tooltip content="Earn money by referring friends to Echo" />
            </div>

            <div className="flex-1 flex flex-col">
              {userInfo && userInfo.referral_data.approved_referrals > 0 ? (
                <div className="space-y-3 flex-1">
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {userInfo.referral_data.approved_referrals}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Approved Referrals</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(userInfo.referral_data.referral_earnings)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Earned</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">🤝</div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium">You have no referrals</div>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">Share your referral code to start earning</div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Referral Code</div>
                <Button
                  onClick={() => userInfo && handleCopy(userInfo.referral_data.referral_code, 'referral_code')}
                  variant="outline"
                  className="w-full"
                  size="sm"
                  disabled={!userInfo}
                >
                  {copiedField === 'referral_code' ? (
                    <>Copied!</>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {userInfo ? userInfo.referral_data.referral_code : 'N/A'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 