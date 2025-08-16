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
    const hasCookieToken = getCookie('chatAuthToken');

    // If no cookie token, redirect immediately
    if (!hasCookieToken) {
      redirectToAccountLogin('chat');
      return;
    }

    // If we have a cookie but still not authenticated after a reasonable time, redirect
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
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
