export interface PopulationMetrics {
  as_of: string;
  c_pop: number;          // total chat messages
  v_pop: number;          // total conversions
  rho_pop: number;        // population conversion rate
}

export interface UserDensityMetrics {
  density_coeff: number;  // κ = rho_user / rho_pop
  kappa_24h: number;      // 24-hour density spike
  conv_density_sub: number; // conversion density sub-score (0-100)
}

export interface ChatStreakData {
  streak_days: number;
  multiplier: number;     // 1 + min(streak, 10) * 0.005
  booster_percentage: number; // percentage bonus (0-5%)
  next_milestone: number; // next streak milestone
}

export interface ReferralData {
  referral_code: string;
  qualified_referrals: number; // this month
  monthly_limit: number;       // max 20/month
  pending_referrals: number;   // not yet qualified
  earnings_referrals: number;  // lifetime $10 bonuses
  short_link: string;
}

export interface TrustWarning {
  code: 'DENSITY_SPIKE' | 'HIGH_REFUND_RATE' | 'UNUSUAL_PATTERN' | 'VERIFICATION_NEEDED';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action_required?: boolean;
  resolution_steps?: string[];
}

export interface TrustDiagnostics {
  // Core trust data
  level: number;
  score: number;
  multiplier: number;       // e.g. 0.92x for display
  
  // R2 additions
  density_metrics: UserDensityMetrics;
  chat_streak: ChatStreakData;
  referral_data: ReferralData;
  warnings: TrustWarning[];
  hard_cut: boolean;        // fraud protection active
  
  // Breakdown for transparency
  subscores: {
    base_activity: number;
    conversion_rate: number;
    conversion_density: number;
    account_age: number;
    verification_status: number;
  };
}

export interface EnhancedEarningsStats {
  // Base earnings (from original system)
  estimated: number;
  confirmed: number;
  paid: number;
  available: number;
  
  // R2 enhancements
  base_earnings: number;        // before booster
  streak_booster: number;       // additional from chat streak
  booster_percentage: number;   // visual percentage for UI
  referral_earnings: number;    // from referral bonuses
  
  // Recent activity
  today: number;
  this_week: number;
  this_month: number;
  lifetime: number;
}

export interface ReferralInvite {
  code: string;
  short_link: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
}

export interface ReferralProgress {
  friend_email?: string;
  days_active: number;
  qualified: boolean;
  credited: boolean;
  registration_date: string;
  last_active: string;
}

// API response types
export interface TrustDiagnosticsResponse {
  diagnostics: TrustDiagnostics;
  population_metrics: PopulationMetrics;
  last_updated: string;
}

export interface ReferralCodeResponse {
  invite: ReferralInvite;
  progress: ReferralProgress[];
  monthly_stats: {
    qualified_this_month: number;
    limit_remaining: number;
    earnings_this_month: number;
  };
}

// Component prop types
export interface DensityGaugeProps {
  kappa: number;              // density coefficient
  className?: string;
  showTooltip?: boolean;
}

export interface ChatStreakDisplayProps {
  streak: ChatStreakData;
  compact?: boolean;
  className?: string;
}

export interface ReferralCTAProps {
  referralData: ReferralData;
  onGenerateCode: () => Promise<ReferralInvite>;
  className?: string;
}

export interface TrustWarningChipProps {
  warning: TrustWarning;
  onDismiss?: () => void;
  className?: string;
}

export interface TrustDiagnosticsPanelProps {
  diagnostics: TrustDiagnostics;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
} 