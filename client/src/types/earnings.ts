export interface User {
  id: string;
  email: string;
  stripe_account_id?: string;
  trust_level: number; // 1-5
  kyc_status: 'none' | 'pending' | 'verified';
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  amount_usd: number;
  direction: 'credit' | 'debit';
  state: 'pending' | 'confirmed' | 'paid' | 'reversed';
  risk_hold_pct: number;
  ref_type: 'conversion' | 'payout' | 'reserve' | 'adjustment';
  ref_id?: string;
  created_at: string;
  confirmed_at?: string;
  paid_at?: string;
  description?: string;
}

export interface UserBalance {
  estimated: number;    // pending credits
  confirmed: number;    // confirmed but not paid
  paid: number;         // lifetime paid out
  available: number;    // confirmed - minimum_payout_threshold
}

export interface PayoutRail {
  id: 'ach_standard' | 'instant_visa_mc';
  name: string;
  minimum_amount: number;
  fee_fixed: number;
  fee_percentage: number;
  description: string;
  estimated_time: string;
  recommended_minimum: number;
}

export interface TrustLevel {
  level: number;
  name: string;
  color: string;
  description: string;
  benefits: string[];
  requirements?: string[];
}

export interface EarningsStats {
  today: number;
  this_week: number;
  this_month: number;
  lifetime: number;
}

export interface PayoutRequest {
  amount: number;
  rail: PayoutRail['id'];
  estimated_fee: number;
  net_amount: number;
} 