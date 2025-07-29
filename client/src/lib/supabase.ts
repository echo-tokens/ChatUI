import { createClient } from '@supabase/supabase-js';

// Use the environment variables that match Railway deployment
// Vite apps use VITE_ prefix, but also check for legacy REACT_APP_ and direct names
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  process.env.REACT_APP_SUPABASE_URL || 
  'https://rgrlrawmkmzclisyerln.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJncmxyYXdta21aa2xpc3llcmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3OTM3ODEsImV4cCI6MjA1NDM2OTc4MX0.bfIJmPJU41uWKxrNBtF2IDXOH7XdNwf4U3h2OwD5iBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase initialized with:', { 
  url: supabaseUrl.substring(0, 30) + '...', 
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

// Types for R2 Trust System
export interface TrustDiagnosticsResponse {
  user_id: string;
  trust_level: number;
  trust_score: number;
  revenue_multiplier: number;
  streak_days: number;
  density_coeff: number;
  warnings: any[];
  hard_cut: boolean;
  qualified_referrals_month: number;
  subscores: {
    base_activity: number;
    conversion_rate: number;
    conversion_density: number;
    account_age: number;
    verification_status: number;
  };
}

export interface UserEarningsResponse {
  user_id: string;
  estimated: number;
  confirmed: number;
  paid: number;
  available: number;
  base_earnings: number;
  streak_booster: number;
  booster_percentage: number;
  referral_earnings: number;
  today: number;
  this_week: number;
  this_month: number;
  lifetime: number;
}

export interface ReferralDataResponse {
  referral_code: string;
  qualified_referrals: number;
  monthly_limit: number;
  pending_referrals: number;
  earnings_referrals: number;
  short_link: string;
}

// Fetch user trust diagnostics
export async function fetchUserTrustDiagnostics(userId: string): Promise<{
  diagnostics: TrustDiagnosticsResponse | null;
  referral: ReferralDataResponse | null;
  error: any;
}> {
  try {
    let { data: trustData, error: trustError } = await supabase
      .from('user_trust_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (trustError) {
      // If user doesn't exist, create initial trust metrics
      if (trustError.code === 'PGRST116') {
        await supabase
          .from('user_trust_metrics')
          .insert([{
            user_id: userId,
            trust_level: 1,
            trust_score: 50.0,
            revenue_multiplier: 0.5,
            base_activity_score: 50,
            conversion_rate_score: 50,
            conversion_density_score: 50,
            account_age_score: 50,
            verification_status_score: 0,
            streak_days: 0,
            density_coeff: 1.0,
            warnings: [],
            hard_cut: false
          }]);

        // Retry fetch
        const { data: newTrustData, error: newTrustError } = await supabase
          .from('user_trust_metrics')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (newTrustError) throw newTrustError;
        trustData = newTrustData;
      } else {
        throw trustError;
      }
    }

    const { data: warningsData } = await supabase
      .from('trust_warnings')
      .select('*')
      .eq('user_id', userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    const { data: referralData } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: referralProgressData } = await supabase
      .from('referral_progress')
      .select('*')
      .eq('referrer_id', userId);

    const qualifiedReferrals = referralProgressData?.filter(r => r.qualified)?.length || 0;
    const pendingReferrals = referralProgressData?.filter(r => !r.qualified)?.length || 0;

    // Calculate referral earnings
    const { data: referralEarnings } = await supabase
      .from('ledger')
      .select('amount_usd')
      .eq('user_id', userId)
      .eq('ref_type', 'referral')
      .eq('state', 'confirmed');

    const totalReferralEarnings = referralEarnings?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const diagnostics: TrustDiagnosticsResponse = {
      user_id: userId,
      trust_level: trustData.trust_level,
      trust_score: trustData.trust_score,
      revenue_multiplier: trustData.revenue_multiplier,
      streak_days: trustData.streak_days,
      density_coeff: trustData.density_coeff,
      warnings: warningsData || [],
      hard_cut: trustData.hard_cut,
      qualified_referrals_month: trustData.qualified_referrals_month,
      subscores: {
        base_activity: trustData.base_activity_score,
        conversion_rate: trustData.conversion_rate_score,
        conversion_density: trustData.conversion_density_score,
        account_age: trustData.account_age_score,
        verification_status: trustData.verification_status_score,
      }
    };

    const referral: ReferralDataResponse = {
      referral_code: referralData?.code || '',
      qualified_referrals: qualifiedReferrals,
      monthly_limit: 20,
      pending_referrals: pendingReferrals,
      earnings_referrals: totalReferralEarnings,
      short_link: referralData?.short_link || '',
    };

    return { diagnostics, referral, error: null };
  } catch (error) {
    console.error('Trust diagnostics fetch error:', error);
    return { diagnostics: null, referral: null, error };
  }
}

// Fetch user earnings with R2 enhancements
export async function fetchUserEarnings(userId: string): Promise<{
  earnings: UserEarningsResponse | null;
  error: any;
}> {
  try {
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ledgerError) throw ledgerError;

    const { data: trustData, error: trustError } = await supabase
      .from('user_trust_metrics')
      .select('streak_days')
      .eq('user_id', userId)
      .single();

    // Calculate earnings
    const confirmedEarnings = ledgerData
      ?.filter(entry => entry.direction === 'credit' && entry.state === 'confirmed')
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const pendingEarnings = ledgerData
      ?.filter(entry => entry.direction === 'credit' && entry.state === 'pending')
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const paidEarnings = ledgerData
      ?.filter(entry => entry.direction === 'debit' && entry.ref_type === 'payout' && entry.state === 'paid')
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const referralEarnings = ledgerData
      ?.filter(entry => entry.ref_type === 'referral' && entry.state === 'confirmed')
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    // Calculate streak booster
    const streakDays = trustData?.streak_days || 0;
    const boosterPercentage = Math.min(streakDays, 10) * 0.5; // 0.5% per day up to 5%
    const baseEarnings = confirmedEarnings + pendingEarnings - referralEarnings;
    const streakBooster = baseEarnings * (boosterPercentage / 100);

    // Time-based calculations
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayEarnings = ledgerData
      ?.filter(entry => new Date(entry.created_at) >= todayStart)
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const thisWeekEarnings = ledgerData
      ?.filter(entry => new Date(entry.created_at) >= weekStart)
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const thisMonthEarnings = ledgerData
      ?.filter(entry => new Date(entry.created_at) >= monthStart)
      ?.reduce((sum, entry) => sum + parseFloat(entry.amount_usd), 0) || 0;

    const lifetime = confirmedEarnings + paidEarnings + referralEarnings;

    const earnings: UserEarningsResponse = {
      user_id: userId,
      estimated: pendingEarnings + streakBooster,
      confirmed: confirmedEarnings,
      paid: paidEarnings,
      available: confirmedEarnings,
      base_earnings: baseEarnings,
      streak_booster: streakBooster,
      booster_percentage: boosterPercentage,
      referral_earnings: referralEarnings,
      today: todayEarnings,
      this_week: thisWeekEarnings,
      this_month: thisMonthEarnings,
      lifetime
    };

    return { earnings, error: null };
  } catch (error) {
    console.error('User earnings fetch error:', error);
    return { earnings: null, error };
  }
}

// Generate referral code
export async function generateReferralCode(userId: string): Promise<{ 
  code: string | null; 
  shortLink: string | null;
  error: any; 
}> {
  try {
    // Check if user already has a code
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('code, short_link')
      .eq('user_id', userId)
      .single();

    if (existingCode) {
      return { 
        code: existingCode.code, 
        shortLink: existingCode.short_link,
        error: null 
      };
    }

    // Generate new code
    const code = `ECHO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const shortLink = `https://echollm.io/r/${code.substring(4)}`;

    const { data, error } = await supabase
      .from('referral_codes')
      .insert([{
        user_id: userId,
        code: code,
        short_link: shortLink,
        max_uses: 50,
        current_uses: 0
      }])
      .select()
      .single();

    if (error) throw error;

    return { 
      code: data.code, 
      shortLink: data.short_link,
      error: null 
    };
  } catch (error) {
    console.error('Generate referral code error:', error);
    return { code: null, shortLink: null, error };
  }
}

// Record chat activity (called when user sends a message)
export async function recordChatActivity(userId: string, messageCount: number = 1) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('user_daily_metrics')
      .upsert([{
        user_id: userId,
        day: today,
        chat_msgs: messageCount
      }], {
        onConflict: 'user_id,day'
      });

    if (error) throw error;

    // Update chat streak
    await supabase.rpc('update_chat_streak', {
      p_user_id: userId
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Record chat activity error:', error);
    return { success: false, error };
  }
}

// Subscribe to real-time trust updates
export function subscribeToTrustUpdates(userId: string, callback: (payload: any) => void) {
  const subscription = supabase
    .channel('trust-updates')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'user_trust_metrics',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();

  return subscription;
} 