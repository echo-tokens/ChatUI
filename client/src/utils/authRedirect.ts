/**
 * Get the account auth service URL for redirects
 */
export function getAccountAuthUrl(): string {
  const accountUrl = process.env.VITE_ACCOUNT_URL!;
  return accountUrl;
}

/**
 * Get the login URL for the account auth service with the appropriate type
 */
export function getAccountLoginUrl(type: string = 'chat'): string {
  const baseUrl = getAccountAuthUrl();
  return `${baseUrl}/login?type=${type}`;
}

/**
 * Redirect to the account auth service login page
 */
export function redirectToAccountLogin(type: string = 'chat'): void {
  const loginUrl = getAccountLoginUrl(type);
  window.location.href = loginUrl;
}
