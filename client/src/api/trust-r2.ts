import type { 
  TrustDiagnosticsResponse, 
  ReferralCodeResponse, 
  PopulationMetrics,
  TrustDiagnostics,
  ReferralInvite,
  ReferralProgress
} from '~/types/trust-r2';

// Mock API functions - replace with actual API calls in production

export async function fetchTrustDiagnostics(userId: string): Promise<TrustDiagnosticsResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock data that follows the R2 specification
  const mockDiagnostics: TrustDiagnostics = {
    level: 3,
    score: 92,
    multiplier: 0.92,
    
    density_metrics: {
      density_coeff: 1.2, // κ = rho_user / rho_pop
      kappa_24h: 2.5,     // 24-hour peak
      conv_density_sub: 85 // conversion density sub-score (0-100)
    },
    
    chat_streak: {
      streak_days: 8,
      multiplier: 1.04,    // 1 + min(8, 10) * 0.005
      booster_percentage: 4.0,
      next_milestone: 10
    },
    
    referral_data: {
      referral_code: 'ECHO2024',
      qualified_referrals: 4,
      monthly_limit: 20,
      pending_referrals: 2,
      earnings_referrals: 40, // $10 * 4 qualified
      short_link: 'https://echo.ai/r/2024'
    },
    
    warnings: [
      {
        code: 'HIGH_REFUND_RATE',
        message: 'Recent conversions have a higher than normal refund rate',
        severity: 'medium',
        action_required: false
      }
    ],
    
    hard_cut: false,
    
    subscores: {
      base_activity: 88,
      conversion_rate: 92,
      conversion_density: 85,
      account_age: 95,
      verification_status: 100
    }
  };

  const mockPopMetrics: PopulationMetrics = {
    as_of: new Date().toISOString(),
    c_pop: 125000,     // total chat messages
    v_pop: 3750,       // total conversions  
    rho_pop: 0.03      // 3% population conversion rate
  };

  return {
    diagnostics: mockDiagnostics,
    population_metrics: mockPopMetrics,
    last_updated: new Date().toISOString()
  };
}

export async function generateReferralCode(userId: string): Promise<ReferralCodeResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const mockInvite: ReferralInvite = {
    code: `ECHO${code}`,
    short_link: `https://echo.ai/r/${code}`,
    current_uses: 0,
    max_uses: 50,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };

  const mockProgress: ReferralProgress[] = [
    {
      friend_email: 'friend1@example.com',
      days_active: 5,
      qualified: false,
      credited: false,
      registration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      last_active: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      friend_email: 'friend2@example.com', 
      days_active: 12,
      qualified: true,
      credited: true,
      registration_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      last_active: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ];

  return {
    invite: mockInvite,
    progress: mockProgress,
    monthly_stats: {
      qualified_this_month: 4,
      limit_remaining: 16,
      earnings_this_month: 40
    }
  };
}

export async function dismissTrustWarning(userId: string, warningCode: string): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Dismissed warning ${warningCode} for user ${userId}`);
  // In real implementation, this would call the backend to dismiss the warning
}

export async function refreshTrustMetrics(userId: string): Promise<void> {
  // Simulate API delay for trust metrics refresh
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log(`Refreshed trust metrics for user ${userId}`);
  // In real implementation, this would trigger a backend recalculation
}

// Real-time subscription using WebSocket/Supabase
export function subscribeTrustUpdates(
  userId: string, 
  onUpdate: (diagnostics: TrustDiagnostics) => void
): () => void {
  console.log(`Subscribing to trust updates for user ${userId}`);
  
  // Simulate periodic updates
  const interval = setInterval(async () => {
    const hasUpdate = Math.random() > 0.9; // 10% chance per check
    
    if (hasUpdate) {
      const response = await fetchTrustDiagnostics(userId);
      onUpdate(response.diagnostics);
      console.log('Trust metrics updated via real-time subscription');
    }
  }, 10000); // Check every 10 seconds

  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log(`Unsubscribed from trust updates for user ${userId}`);
  };
}

// Helper function to check if user needs KYC verification
export async function checkKYCRequirement(userId: string): Promise<{
  required: boolean;
  reason?: string;
  threshold_reached?: number;
}> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock KYC check logic
  const mockLifetimeEarnings = 45; // Simulate $45 lifetime earnings
  const kycThreshold = 50; // $50 threshold
  
  return {
    required: mockLifetimeEarnings >= kycThreshold,
    reason: mockLifetimeEarnings >= kycThreshold ? 'Lifetime earnings exceeded $50' : undefined,
    threshold_reached: mockLifetimeEarnings
  };
}

// API endpoints specification for backend team
export const API_ENDPOINTS = {
  GET_TRUST_DIAGNOSTICS: '/v1/trust/diagnostics',
  POST_REFERRAL_CODE: '/v1/referral/code', 
  DELETE_TRUST_WARNING: '/v1/trust/warnings/:warningCode',
  POST_REFRESH_TRUST: '/v1/trust/refresh',
  GET_KYC_REQUIREMENT: '/v1/trust/kyc-check',
  WEBSOCKET_TRUST_UPDATES: '/ws/trust/updates/:userId'
} as const; 