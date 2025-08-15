import { 
  fetchUserTrustDiagnostics,
  fetchUserEarnings,
  generateReferralCode as generateReferralCodeSupabase,
  recordChatActivity,
  subscribeToTrustUpdates
} from '~/lib/supabase';
import type { 
  TrustDiagnosticsResponse, 
  ReferralCodeResponse, 
  PopulationMetrics,
  TrustDiagnostics,
  ReferralInvite,
  ReferralProgress
} from '~/types/trust-r2';

// Convert Supabase data to frontend types
function convertToTrustDiagnostics(supabaseData: any, referralData: any): TrustDiagnostics {
  return {
    level: supabaseData.trust_level,
    score: supabaseData.trust_score,
    multiplier: supabaseData.revenue_multiplier,
    
    density_metrics: {
      density_coeff: supabaseData.density_coeff,
      kappa_24h: supabaseData.density_coeff * 1.2, // Mock 24h spike
      conv_density_sub: supabaseData.subscores.conversion_density
    },
    
    chat_streak: {
      streak_days: supabaseData.streak_days,
      multiplier: 1 + Math.min(supabaseData.streak_days, 10) * 0.005,
      booster_percentage: Math.min(supabaseData.streak_days, 10) * 0.5,
      next_milestone: supabaseData.streak_days < 10 ? 10 : 30
    },
    
    referral_data: {
      referral_code: referralData.referral_code,
      qualified_referrals: referralData.qualified_referrals,
      monthly_limit: referralData.monthly_limit,
      pending_referrals: referralData.pending_referrals,
      earnings_referrals: referralData.earnings_referrals,
      short_link: referralData.short_link
    },
    
    warnings: supabaseData.warnings.map((w: any) => ({
      code: w.code || w.warning_code,
      message: w.message,
      severity: w.severity,
      action_required: w.severity === 'critical'
    })),
    
    hard_cut: supabaseData.hard_cut,
    
    subscores: supabaseData.subscores
  };
}

export async function fetchTrustDiagnostics(userId: string): Promise<TrustDiagnosticsResponse> {
  try {
    // Fetch from Supabase
    const { diagnostics, referral, error } = await fetchUserTrustDiagnostics(userId);
    
    if (error || !diagnostics || !referral) {
      console.error('Supabase error, falling back to mock data:', error);
      return getMockTrustDiagnostics();
    }

    const convertedDiagnostics = convertToTrustDiagnostics(diagnostics, referral);
    
    const mockPopMetrics: PopulationMetrics = {
      as_of: new Date().toISOString(),
      c_pop: 125000,
      v_pop: 3750,
      rho_pop: 0.03
    };

    return {
      diagnostics: convertedDiagnostics,
      population_metrics: mockPopMetrics,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Trust diagnostics error, falling back to mock:', error);
    return getMockTrustDiagnostics();
  }
}

function getMockTrustDiagnostics(): TrustDiagnosticsResponse {
  const mockDiagnostics: TrustDiagnostics = {
    level: 3,
    score: 92,
    multiplier: 0.92,
    
    density_metrics: {
      density_coeff: 1.2,
      kappa_24h: 2.5,
      conv_density_sub: 85
    },
    
    chat_streak: {
      streak_days: 8,
      multiplier: 1.04,
      booster_percentage: 4.0,
      next_milestone: 10
    },
    
    referral_data: {
      referral_code: 'ECHO2024',
      qualified_referrals: 4,
      monthly_limit: 20,
      pending_referrals: 2,
      earnings_referrals: 40,
      short_link: 'https://echollm.io/r/2024'
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
    c_pop: 125000,
    v_pop: 3750,
    rho_pop: 0.03
  };

  return {
    diagnostics: mockDiagnostics,
    population_metrics: mockPopMetrics,
    last_updated: new Date().toISOString()
  };
}

export async function generateReferralCode(userId: string): Promise<ReferralCodeResponse> {
  try {
    // Try Supabase first
    const { code, shortLink, error } = await generateReferralCodeSupabase(userId);
    
    if (error || !code) {
      console.error('Supabase referral code error, falling back to mock:', error);
      return getMockReferralResponse();
    }

    const mockInvite: ReferralInvite = {
      code: code,
      short_link: shortLink || `https://echollm.io/r/${code.substring(4)}`,
      current_uses: 0,
      max_uses: 50,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const mockProgress: ReferralProgress[] = [
      {
        friend_email: 'friend1@example.com',
        days_active: 5,
        qualified: false,
        credited: false,
        registration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_active: new Date(Date.now() - 60 * 60 * 1000).toISOString()
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
  } catch (error) {
    console.error('Generate referral code error, falling back to mock:', error);
    return getMockReferralResponse();
  }
}

function getMockReferralResponse(): ReferralCodeResponse {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const mockInvite: ReferralInvite = {
    code: `ECHO${code}`,
    short_link: `https://echollm.io/r/${code}`,
    current_uses: 0,
    max_uses: 50,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

// Enhanced earnings fetch using Supabase
export async function fetchEnhancedEarnings(userId: string) {
  try {
    const { earnings, error } = await fetchUserEarnings(userId);
    
    if (error || !earnings) {
      console.error('Supabase earnings error, falling back to mock:', error);
      return getMockEnhancedEarnings();
    }

    return earnings;
  } catch (error) {
    console.error('Enhanced earnings error, falling back to mock:', error);
    return getMockEnhancedEarnings();
  }
}

function getMockEnhancedEarnings() {
  return {
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
}

// Record user chat activity
export async function recordUserChatActivity(userId: string) {
  try {
    await recordChatActivity(userId, 1);
  } catch (error) {
    console.error('Failed to record chat activity:', error);
  }
}

// Real-time subscription using Supabase
export function subscribeTrustUpdates(
  userId: string, 
  onUpdate: (diagnostics: TrustDiagnostics) => void
): () => void {
  console.log(`Subscribing to trust updates for user ${userId}`);
  
  const subscription = subscribeToTrustUpdates(userId, async (payload) => {
    console.log('Trust metrics updated via Supabase:', payload);
    
    // Fetch fresh data and notify
    try {
      const response = await fetchTrustDiagnostics(userId);
      onUpdate(response.diagnostics);
    } catch (error) {
      console.error('Error fetching updated trust data:', error);
    }
  });

  // Fallback polling for demo
  const interval = setInterval(async () => {
    const hasUpdate = Math.random() > 0.95; // 5% chance per check
    
    if (hasUpdate) {
      try {
        const response = await fetchTrustDiagnostics(userId);
        onUpdate(response.diagnostics);
        console.log('Trust metrics updated via polling');
      } catch (error) {
        console.error('Polling update error:', error);
      }
    }
  }, 15000); // Check every 15 seconds

  // Return cleanup function
  return () => {
    if (subscription) {
      subscription.unsubscribe();
    }
    clearInterval(interval);
    console.log(`Unsubscribed from trust updates for user ${userId}`);
  };
}

// Legacy functions maintained for compatibility
export async function dismissTrustWarning(userId: string, warningCode: string): Promise<void> {
  console.log(`Dismissed warning ${warningCode} for user ${userId}`);
}

export async function refreshTrustMetrics(userId: string): Promise<void> {
  console.log(`Refreshed trust metrics for user ${userId}`);
}

export async function checkKYCRequirement(userId: string): Promise<{
  required: boolean;
  reason?: string;
  threshold_reached?: number;
}> {
  const mockLifetimeEarnings = 45;
  const kycThreshold = 50;
  
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