import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from './AuthContext';
import { request } from '../../../packages/data-provider';

interface TrustData {
  trust_level: number;
  change_in_trust: number;
}

interface TaskEarnings {
  total_earnings: number;
  paid_earnings: number;
  confirmed_earnings: number;
  pending_earnings: number;
  earnings_week: number;
  earnings_month: number;
}

interface UserInfoResponse {
  user_id: string;
  trust: TrustData;
  task_earnings: TaskEarnings;
  account_created: string;
  _mock?: boolean;
}

export const useUserInfo = () => {
  const { user, token } = useAuthContext();

  return useQuery({
    queryKey: ['userInfo', user?.id],
    queryFn: async (): Promise<UserInfoResponse> => {
      if (!user?.id || !token) {
        throw new Error('User not authenticated');
      }

      try {
        return await request.get<UserInfoResponse>(`/api/accounts/user-info/${user.id}`);
      } catch (error: any) {
        console.error('useUserInfo: Error fetching user info:', error);
        throw new Error(`Failed to fetch user info: ${error?.message || 'Unknown error'}`);
      }
    },
    enabled: !!user?.id && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes to keep data fresh
  });
};