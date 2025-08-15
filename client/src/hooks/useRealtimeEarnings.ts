import { useEffect, useState } from 'react';
import type { UserBalance, LedgerEntry, EarningsStats } from '~/types/earnings';

interface RealtimeEarningsData {
  balance: UserBalance;
  stats: EarningsStats;
  recentTransactions: LedgerEntry[];
}

interface UseRealtimeEarningsProps {
  userId: string;
  enabled?: boolean;
}

export function useRealtimeEarnings({ userId, enabled = true }: UseRealtimeEarningsProps) {
  const [data, setData] = useState<RealtimeEarningsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Simulated WebSocket connection - in real implementation this would use Supabase Realtime
    const connectToRealtime = () => {
      console.log(`Connecting to realtime earnings for user: ${userId}`);
      setIsConnected(true);

      // Simulate receiving real-time updates
      const interval = setInterval(() => {
        // Simulate random earnings update
        const hasUpdate = Math.random() > 0.95; // 5% chance per check

        if (hasUpdate) {
          const newEarning = +(Math.random() * 5).toFixed(2);
          
          setData(prev => {
            if (!prev) return prev;
            
            const newTransaction: LedgerEntry = {
              id: `realtime_${Date.now()}`,
              user_id: userId,
              amount_usd: newEarning,
              direction: 'credit',
              state: 'pending',
              risk_hold_pct: 0.02,
              ref_type: 'conversion',
              created_at: new Date().toISOString(),
              description: 'Real-time ad engagement'
            };

            return {
              ...prev,
              balance: {
                ...prev.balance,
                estimated: prev.balance.estimated + newEarning,
              },
              stats: {
                ...prev.stats,
                today: prev.stats.today + newEarning,
                this_week: prev.stats.this_week + newEarning,
                this_month: prev.stats.this_month + newEarning,
                lifetime: prev.stats.lifetime + newEarning,
              },
              recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)]
            };
          });

          setLastUpdate(new Date());
          
          // Show notification (in real app, this might trigger a toast)
          console.log(`💰 New earning: $${newEarning}`);
        }
      }, 5000); // Check every 5 seconds

      return () => {
        clearInterval(interval);
        setIsConnected(false);
        console.log('Disconnected from realtime earnings');
      };
    };

    const cleanup = connectToRealtime();
    return cleanup;
  }, [userId, enabled]);

  // Simulated initial data fetch
  useEffect(() => {
    if (!enabled || !userId) return;

    // Mock initial data
    const initialData: RealtimeEarningsData = {
      balance: {
        estimated: 24.75,
        confirmed: 42.30,
        paid: 186.45,
        available: 42.30,
      },
      stats: {
        today: 3.25,
        this_week: 18.90,
        this_month: 67.05,
        lifetime: 253.50,
      },
      recentTransactions: []
    };

    setData(initialData);
  }, [userId, enabled]);

  return {
    data,
    isConnected,
    lastUpdate,
  };
}

export default useRealtimeEarnings; 