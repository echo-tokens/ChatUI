import React from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { EarningsDashboardR2 } from '~/components/Earnings';
import type { User } from '~/types/trust-r2';

export default function EarningsPage() {
  const { user: authUser, isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    window.location.href = '/login';
    return null;
  }

  // Convert auth user to R2 earnings user format
  const user: User | undefined = authUser ? {
    id: authUser.id,
    email: authUser.email || '',
    stripe_account_id: (authUser as any).stripe_account_id,
    trust_level: (authUser as any).trust_level || 1,
    kyc_status: (authUser as any).kyc_status || 'none',
    created_at: authUser.createdAt || new Date().toISOString(),
    updated_at: authUser.updatedAt || new Date().toISOString(),
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto">
        <EarningsDashboardR2 user={user} />
      </div>
    </div>
  );
} 