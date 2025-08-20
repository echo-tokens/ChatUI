import type { 
  UserInfoResponse
} from '~/types/trust-r2';

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
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[fetchUserInfo] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorBody;
      let errorMessage;
      try {
        errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error || errorJson.message || errorJson.details || errorBody;
      } catch {
        errorMessage = errorBody || response.statusText;
      }
      console.error('[fetchUserInfo] Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        parsedMessage: errorMessage
      });
      throw new Error(errorMessage || `Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
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