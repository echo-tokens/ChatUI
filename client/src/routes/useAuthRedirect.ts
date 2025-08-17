import { useEffect } from 'react';
import { useAuthContext } from '~/hooks';
import { redirectToAccountLogin } from '~/utils/authRedirect';

export default function useAuthRedirect() {
  const { user, isAuthenticated } = useAuthContext();

  useEffect(() => {
    // Helper function to get cookie
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // Check for chatAuthToken cookie immediately
    const cookieToken = getCookie('chatAuthToken');
    const localStorageToken = localStorage.getItem('authToken');

    // If we have a cookie token but no localStorage token, transfer it
    if (cookieToken && !localStorageToken) {
      console.log('useAuthRedirect: Found chatAuthToken cookie, transferring to localStorage');
      localStorage.setItem('authToken', cookieToken);
      
      // Trigger the tokenUpdated event to set up authentication
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: cookieToken }));
      return;
    }

    // If no cookie token and no localStorage token, redirect immediately
    if (!cookieToken && !localStorageToken) {
      console.log('useAuthRedirect: No chatAuthToken cookie or localStorage token found, redirecting to account login');
      redirectToAccountLogin('chat');
      return;
    }

    // If we have a localStorage token but still not authenticated after a reasonable time, redirect
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log('useAuthRedirect: Not authenticated after 3 seconds, redirecting to account login');
        redirectToAccountLogin('chat');
      }
    }, 3000); // 3 second timeout

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated]);

  return {
    user,
    isAuthenticated,
  };
}
