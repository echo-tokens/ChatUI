import type {
  UserInfoResponse
} from '~/types/trust-r2';
import { request } from 'librechat-data-provider';

// Fetch user info from AccountManagement service
export async function fetchUserInfo(userId: string, token: string): Promise<UserInfoResponse> {
  // Use relative URL to go through Vite proxy in development
  // This will be proxied to http://localhost:3080 by Vite in dev mode
  // In production, this will hit the same origin
  const fullUrl = `/api/accounts/user-info/${userId}`;

  console.log('[fetchUserInfo] Starting API call:', {
    url: fullUrl,
    userId,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token',
    note: 'Using relative URL to go through Vite proxy'
  });

  try {
    const data = await request.get<UserInfoResponse>(fullUrl);
    console.log('[fetchUserInfo] Success! Data received:', data);
    return data;
  } catch (error) {
    console.error('[fetchUserInfo] Fetch failed:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      url: fullUrl
    });
    throw error;
  }
} 