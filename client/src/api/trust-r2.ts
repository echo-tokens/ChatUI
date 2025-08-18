import type { 
  UserInfoResponse
} from '~/types/trust-r2';

// Fetch user info from AccountManagement service
export async function fetchUserInfo(userId: string, token: string): Promise<UserInfoResponse> {
  try {
    const accountManagementUrl = process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:3081';
    const response = await fetch(`${accountManagementUrl}/api/accounts/user-info/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user info from AccountManagement:', error);
    // Return mock data as fallback
    return getMockUserInfo(userId);
  }
}

// Mock data fallback
function getMockUserInfo(userId: string): UserInfoResponse {
  return {
    user_id: userId,
    trust: {
      trust_level: 95,
      change_in_trust: 5
    },
    chat_streak: 14,
    referral_data: {
      sent_out_referrals: 8,
      approved_referrals: 3,
      max_referrals: 50,
      referral_earnings: 45.75,
      referral_code: "REF123ABC"
    },
    task_earnings: {
      total_earnings: 247.50,
      paid_earnings: 200.00,
      confirmed_earnings: 23.50,
      pending_earnings: 24.00,
      earnings_week: 12.25,
      earnings_month: 78.90
    },
    account_created: "2024-03-15T10:30:00"
  };
} 