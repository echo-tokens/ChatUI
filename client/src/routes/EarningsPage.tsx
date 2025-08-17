import React from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import StreamlinedEarningsDashboard from '~/components/Earnings/StreamlinedEarningsDashboard';
import type { User } from '~/types/trust-r2';
import { redirectToAccountLogin } from '~/utils/authRedirect';

export default function EarningsPage() {
  const { user: authUser, isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    console.log('EarningsPage: User not authenticated, redirecting to account login');
    redirectToAccountLogin('chat');
    return null;
  }

  // Convert auth user to earnings user format
  const user: User | undefined = authUser ? {
    id: authUser.id,
    email: authUser.email || '',
    stripe_account_id: (authUser as any).stripe_account_id,
    trust_level: (authUser as any).trust_level || 1,
    kyc_status: (authUser as any).kyc_status || 'none',
    created_at: authUser.createdAt || new Date().toISOString(),
    updated_at: authUser.updatedAt || new Date().toISOString(),
  } : undefined;

  return <StreamlinedEarningsDashboard user={user} />;
} 