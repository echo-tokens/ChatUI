import React, { useState, useEffect } from 'react';
import { Plus, Settings, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import EarningsCard from './EarningsCard';
import TransactionTable from './TransactionTable';
import CashOutModal from './CashOutModal';
import TrustBadge from './TrustBadge';
import StripeSetupFlow from './StripeSetupFlow';
import type { User, UserBalance, EarningsStats, LedgerEntry, PayoutRequest } from '~/types/earnings';

interface EarningsDashboardProps {
  user?: User;
  className?: string;
}

// Mock data for development - in real app this would come from API/Supabase
const mockUser: User = {
  id: 'user-123',
  email: 'user@example.com',
  stripe_account_id: 'acct_example123',
  trust_level: 3,
  kyc_status: 'verified',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockBalance: UserBalance = {
  estimated: 24.75,
  confirmed: 42.30,
  paid: 186.45,
  available: 42.30,
};

const mockStats: EarningsStats = {
  today: 3.25,
  this_week: 18.90,
  this_month: 67.05,
  lifetime: 253.50,
};

const mockTransactions: LedgerEntry[] = [
  {
    id: '1',
    user_id: 'user-123',
    amount_usd: 12.50,
    direction: 'credit',
    state: 'confirmed',
    risk_hold_pct: 0.02,
    ref_type: 'conversion',
    ref_id: 'conv_456',
    created_at: '2024-01-15T10:30:00Z',
    confirmed_at: '2024-01-15T10:31:00Z',
    description: 'Ad engagement - Tech product signup',
  },
  {
    id: '2',
    user_id: 'user-123',
    amount_usd: 8.75,
    direction: 'credit',
    state: 'pending',
    risk_hold_pct: 0.02,
    ref_type: 'conversion',
    ref_id: 'conv_789',
    created_at: '2024-01-14T15:45:00Z',
    description: 'Ad engagement - SaaS subscription',
  },
  {
    id: '3',
    user_id: 'user-123',
    amount_usd: 35.20,
    direction: 'debit',
    state: 'paid',
    risk_hold_pct: 0.00,
    ref_type: 'payout',
    ref_id: 'payout_123',
    created_at: '2024-01-10T09:15:00Z',
    paid_at: '2024-01-10T09:16:00Z',
    description: 'Bank transfer payout',
  },
];

export default function EarningsDashboard({ user, className }: EarningsDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [balance, setBalance] = useState<UserBalance>(mockBalance);
  const [stats, setStats] = useState<EarningsStats>(mockStats);
  const [transactions, setTransactions] = useState<LedgerEntry[]>(mockTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Check if user needs Stripe setup
  const needsStripeSetup = !currentUser?.stripe_account_id;

  useEffect(() => {
    // In real app, fetch user data here
    if (!currentUser) {
      // Simulate loading user data
      setIsLoading(true);
      setTimeout(() => {
        setCurrentUser(mockUser);
        setIsLoading(false);
      }, 1000);
    }
  }, [currentUser]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const handleStripeSetupComplete = () => {
    setCurrentUser(prev => prev ? { ...prev, stripe_account_id: 'acct_new_123' } : null);
    setShowStripeSetup(false);
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
    
    try {
      // Simulate API call to process payout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update balance and add transaction
      setBalance(prev => ({
        ...prev,
        confirmed: prev.confirmed - request.amount,
        available: prev.available - request.amount,
      }));
      
      const newTransaction: LedgerEntry = {
        id: `payout_${Date.now()}`,
        user_id: currentUser?.id || '',
        amount_usd: request.amount,
        direction: 'debit',
        state: 'paid',
        risk_hold_pct: 0,
        ref_type: 'payout',
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        description: `${request.rail === 'ach_standard' ? 'Bank transfer' : 'Instant'} payout`,
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (error) {
      throw new Error('Payout processing failed');
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const handleManageStripe = () => {
    // Open Stripe Connect dashboard
    window.open('https://connect.stripe.com/dashboard', '_blank');
  };

  if (isLoading && !currentUser) {
    return (
      <div className={cn('max-w-7xl mx-auto p-6', className)}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Show Stripe setup if needed and triggered
  if (needsStripeSetup && showStripeSetup) {
    return (
      <div className={cn('max-w-7xl mx-auto p-6', className)}>
        <StripeSetupFlow 
          onSetupComplete={handleStripeSetupComplete}
          onClose={() => setShowStripeSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Earnings Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track your Echo earnings and manage payouts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {currentUser && (
            <TrustBadge level={currentUser.trust_level} size="lg" />
          )}
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stripe Setup Banner */}
      {needsStripeSetup && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Set up payouts to start earning
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Connect your bank account to receive your Echo earnings
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowStripeSetup(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Set Up Payouts
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Earnings & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <EarningsCard 
            balance={balance}
            stats={stats}
            isLoading={isLoading}
          />
          
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={handleCashOut}
                disabled={balance.available <= 0}
                className="flex items-center justify-center gap-2 h-12"
              >
                <Plus className="h-4 w-4" />
                {needsStripeSetup ? 'Set Up Payouts' : 'Cash Out'}
              </Button>
              
              {!needsStripeSetup && (
                <Button
                  onClick={handleManageStripe}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-12"
                >
                  <Settings className="h-4 w-4" />
                  Manage Account
                </Button>
              )}
              
              <Button
                onClick={() => window.open('/help/earnings', '_blank')}
                variant="outline"
                className="flex items-center justify-center gap-2 h-12"
              >
                <ExternalLink className="h-4 w-4" />
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column - Trust Level Details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Account Status
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Trust Level</label>
                {currentUser && (
                  <div className="mt-1">
                    <TrustBadge level={currentUser.trust_level} size="lg" />
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">KYC Status</label>
                <div className="mt-1">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                    currentUser?.kyc_status === 'verified' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : currentUser?.kyc_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  )}>
                    {currentUser?.kyc_status || 'none'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Payout Status</label>
                <div className="mt-1">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    currentUser?.stripe_account_id 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  )}>
                    {currentUser?.stripe_account_id ? 'Connected' : 'Not Set Up'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Share Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revenue Share
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Your Share:</span>
                <span className="font-medium">
                  {currentUser?.trust_level === 1 ? '70%' :
                   currentUser?.trust_level === 2 ? '75%' :
                   currentUser?.trust_level === 3 ? '85%' :
                   currentUser?.trust_level === 4 ? '90%' : '95%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Platform Fee:</span>
                <span className="font-medium">
                  {currentUser?.trust_level === 1 ? '30%' :
                   currentUser?.trust_level === 2 ? '25%' :
                   currentUser?.trust_level === 3 ? '15%' :
                   currentUser?.trust_level === 4 ? '10%' : '5%'}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Increase your trust level to earn a higher share
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <TransactionTable 
        transactions={transactions}
        isLoading={isLoading}
      />

      {/* Cash Out Modal */}
      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        availableBalance={balance.available}
        onSubmitPayout={handleSubmitPayout}
        isProcessing={isProcessingPayout}
      />
    </div>
  );
} 