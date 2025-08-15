import React, { useState, useEffect } from 'react';
import { Plus, Settings, ExternalLink, RefreshCw, Shield } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import EnhancedEarningsCard from './EnhancedEarningsCard';
import TransactionTable from './TransactionTable';
import CashOutModal from './CashOutModal';
import TrustBadge from './TrustBadge';
import StripeSetupFlow from './StripeSetupFlow';
import { TrustDiagnosticsPanel } from '~/components/Trust';
import { fetchTrustDiagnostics, subscribeTrustUpdates } from '~/api/trust-r2';
import type { 
  User, 
  EnhancedEarningsStats, 
  LedgerEntry, 
  PayoutRequest,
  TrustDiagnostics,
  ChatStreakData
} from '~/types/trust-r2';

interface EarningsDashboardR2Props {
  user?: User;
  className?: string;
}

// Enhanced mock data with R2 features
const mockEnhancedEarnings: EnhancedEarningsStats = {
  estimated: 26.95,        // Base 24.75 + 2.20 booster  
  confirmed: 42.30,
  paid: 186.45,
  available: 42.30,
  base_earnings: 24.75,
  streak_booster: 2.20,    // 4% of base
  booster_percentage: 4.0,
  referral_earnings: 40,   // 4 * $10
  today: 4.15,             // Base 3.25 + 4% booster
  this_week: 19.65,
  this_month: 69.73,
  lifetime: 294.70,        // Including referral bonuses
};

const mockChatStreak: ChatStreakData = {
  streak_days: 8,
  multiplier: 1.04,        // 1 + min(8, 10) * 0.005
  booster_percentage: 4.0,
  next_milestone: 10
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
    description: 'Ad engagement - Tech product signup (4% streak bonus)',
  },
  {
    id: '2',
    user_id: 'user-123',
    amount_usd: 10.00,
    direction: 'credit',
    state: 'confirmed',
    risk_hold_pct: 0.00,
    ref_type: 'referral',
    ref_id: 'ref_789',
    created_at: '2024-01-14T15:45:00Z',
    confirmed_at: '2024-01-14T15:45:00Z',
    description: 'Referral bonus - Friend qualified (7 days active)',
  },
  {
    id: '3',
    user_id: 'user-123',
    amount_usd: 8.33,
    direction: 'credit',
    state: 'pending',
    risk_hold_pct: 0.02,
    ref_type: 'conversion',
    ref_id: 'conv_890',
    created_at: '2024-01-13T20:15:00Z',
    description: 'Ad engagement - SaaS subscription (4% streak bonus)',
  },
];

export default function EarningsDashboardR2({ user, className }: EarningsDashboardR2Props) {
  const [currentUser, setCurrentUser] = useState<User | null>(user || null);
  const [earnings, setEarnings] = useState<EnhancedEarningsStats>(mockEnhancedEarnings);
  const [transactions, setTransactions] = useState<LedgerEntry[]>(mockTransactions);
  const [trustDiagnostics, setTrustDiagnostics] = useState<TrustDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [showTrustPanel, setShowTrustPanel] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Check if user needs Stripe setup
  const needsStripeSetup = !currentUser?.stripe_account_id;

  useEffect(() => {
    // Load initial user and trust data
    if (!currentUser) {
      setIsLoading(true);
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
        setIsLoading(false);
      }, 1000);
    }
  }, [currentUser]);

  useEffect(() => {
    // Load trust diagnostics
    if (currentUser && !trustDiagnostics) {
      fetchTrustDiagnostics(currentUser.id).then(response => {
        setTrustDiagnostics(response.diagnostics);
      });
    }
  }, [currentUser, trustDiagnostics]);

  useEffect(() => {
    // Subscribe to real-time trust updates
    if (currentUser) {
      const unsubscribe = subscribeTrustUpdates(currentUser.id, (updatedDiagnostics) => {
        setTrustDiagnostics(updatedDiagnostics);
        // Update earnings with new booster data
        if (updatedDiagnostics.chat_streak.booster_percentage !== earnings.booster_percentage) {
          setEarnings(prev => ({
            ...prev,
            booster_percentage: updatedDiagnostics.chat_streak.booster_percentage,
            streak_booster: prev.base_earnings * (updatedDiagnostics.chat_streak.booster_percentage / 100),
          }));
        }
      });

      return unsubscribe;
    }
  }, [currentUser, earnings.booster_percentage, earnings.base_earnings]);

  const handleRefresh = async () => {
    setIsLoading(true);
    if (currentUser) {
      const response = await fetchTrustDiagnostics(currentUser.id);
      setTrustDiagnostics(response.diagnostics);
    }
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEarnings(prev => ({
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
            Track your Echo earnings with R2 trust and engagement features
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

          <Button
            onClick={() => setShowTrustPanel(!showTrustPanel)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {showTrustPanel ? 'Hide' : 'Trust'} Diagnostics
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
                  Connect your bank account to receive your Echo earnings with R2 boosts
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

      {/* Main Content Grid */}
      <div className={cn(
        'grid gap-6',
        showTrustPanel ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'
      )}>
        {/* Left Column - Enhanced Earnings */}
        <div className={cn('space-y-6', showTrustPanel ? 'xl:col-span-2' : 'lg:col-span-2')}>
          <EnhancedEarningsCard 
            earnings={earnings}
            streak={mockChatStreak}
            isLoading={isLoading}
          />
          
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                onClick={handleCashOut}
                disabled={earnings.available <= 0}
                className="flex items-center justify-center gap-2 h-12"
              >
                <Plus className="h-4 w-4" />
                {needsStripeSetup ? 'Set Up Payouts' : 'Cash Out'}
              </Button>
              
              {!needsStripeSetup && (
                <Button
                  onClick={() => window.open('https://connect.stripe.com/dashboard', '_blank')}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-12"
                >
                  <Settings className="h-4 w-4" />
                  Manage Account
                </Button>
              )}
              
              <Button
                onClick={() => setShowTrustPanel(!showTrustPanel)}
                variant="outline"
                className="flex items-center justify-center gap-2 h-12"
              >
                <Shield className="h-4 w-4" />
                Trust Panel
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column - Trust Diagnostics */}
        {showTrustPanel && trustDiagnostics && (
          <div className="space-y-6">
            <TrustDiagnosticsPanel
              diagnostics={trustDiagnostics}
              isLoading={isLoading}
              onRefresh={handleRefresh}
            />
          </div>
        )}

        {/* Account Status (when trust panel is hidden) */}
        {!showTrustPanel && (
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
                  <label className="text-sm text-gray-600 dark:text-gray-300">Chat Streak</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium">
                      🔥 {mockChatStreak.streak_days} days (+{mockChatStreak.booster_percentage}%)
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">KYC Status</label>
                  <div className="mt-1">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                      currentUser?.kyc_status === 'verified' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    )}>
                      {currentUser?.kyc_status || 'none'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* R2 Features Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                R2 Features
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Conversion Density:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">1.2x (Normal)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Streak Bonus:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">+4.0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Referrals This Month:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">4 / 20</span>
                </div>
              </div>
              <Button
                onClick={() => setShowTrustPanel(true)}
                variant="outline"
                className="w-full mt-4"
              >
                View Full Diagnostics
              </Button>
            </div>
          </div>
        )}
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
        availableBalance={earnings.available}
        onSubmitPayout={handleSubmitPayout}
        isProcessing={isProcessingPayout}
      />
    </div>
  );
} 