// Base User type for simplified system
export interface User {
  id: string;
  email: string;
  stripe_account_id?: string;
  trust_level: number;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

// Payout request structure
export interface PayoutRequest {
  amount: number;
  rail: 'ach_standard' | 'instant_visa_mc';
  estimated_fee: number;
  net_amount: number;
}

// New simplified data structures matching AccountManagement API
export interface UserInfoResponse {
  user_id: string;
  trust: {
    trust_level: number;
    change_in_trust: number;
  };
  chat_streak: number;
  referral_data: {
    sent_out_referrals: number;
    approved_referrals: number;
    max_referrals: number;
    referral_earnings: number;
    referral_code: string;
  };
  task_earnings: {
    total_earnings: number;
    paid_earnings: number;
    confirmed_earnings: number;
    pending_earnings: number;
    earnings_week: number;
    earnings_month: number;
  };
  account_created: string;
}

// Component prop types for simplified dashboard
export interface ChatStreakDisplayProps {
  streak_days: number;
  compact?: boolean;
  className?: string;
}

export interface ReferralCTAProps {
  referralData: {
    sent_out_referrals: number;
    approved_referrals: number;
    max_referrals: number;
    referral_earnings: number;
    referral_code: string;
  };
  className?: string;
} 