import {
  useRef,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from 'react';
import { debounce } from 'lodash';
import { useRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { setTokenHeader, SystemRoles } from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import {
  useGetRole,
  useGetUserQuery,
  useLogoutUserMutation,
  useRefreshTokenMutation,
} from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext, TResError } from '~/common';
import { redirectToAccountLogin } from '~/utils/authRedirect';
import useTimeout from './useTimeout';
import store from '~/store';

const AuthContext = createContext<TAuthContext | undefined>(undefined);

const AuthContextProvider = ({
  authConfig,
  children,
}: {
  authConfig?: TAuthConfig;
  children: ReactNode;
}) => {
  const [user, setUser] = useRecoilState(store.user);
  const [token, setToken] = useState<string | undefined>(() => {
    // Priority: Check for chatAuthToken cookie first, then localStorage
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };
    
    const cookieToken = getCookie('chatAuthToken');
    if (cookieToken) {
      // Use cookie token and store it in localStorage
      localStorage.setItem('authToken', cookieToken);
      setTokenHeader(cookieToken);
      return cookieToken;
    }
    
    // Fallback to localStorage if no cookie
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setTokenHeader(storedToken);
    }
    return storedToken || undefined;
  });
  const [error, setError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const logoutRedirectRef = useRef<string | undefined>(undefined);

  const { data: userRole = null } = useGetRole(SystemRoles.USER, {
    enabled: !!(isAuthenticated && (user?.role ?? '')),
  });
  const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
    enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
  });

  const navigate = useNavigate();

  const setUserContext = useMemo(
    () =>
      debounce((userContext: TUserContext) => {
        const { token, isAuthenticated, user, redirect } = userContext;
        setUser(user);
        setToken(token);
        //@ts-ignore - ok for token to be undefined initially
        setTokenHeader(token);
        setIsAuthenticated(isAuthenticated);

        // Use a custom redirect if set
        const finalRedirect = logoutRedirectRef.current || redirect;
        // Clear the stored redirect
        logoutRedirectRef.current = undefined;

        if (finalRedirect == null) {
          return;
        }

        if (finalRedirect.startsWith('http://') || finalRedirect.startsWith('https://')) {
          window.location.href = finalRedirect;
        } else {
          navigate(finalRedirect, { replace: true });
        }
      }, 50),
    [navigate, setUser],
  );
  const doSetError = useTimeout({ callback: (error) => setError(error as string | undefined) });


  const logoutUser = useLogoutUserMutation({
    onSuccess: (data) => {
      // Clean up tokens
      localStorage.removeItem('authToken');
      document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
      });
      // Redirect to account auth service login
      redirectToAccountLogin('chat');
    },
    onError: (error) => {
      doSetError((error as Error).message);
      
      // Clean up tokens even on error
      localStorage.removeItem('authToken');
      document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
      });
      // Redirect to account auth service login on error too
      redirectToAccountLogin('chat');
    },
  });
  const refreshToken = useRefreshTokenMutation();

  const logout = useCallback(
    (redirect?: string) => {
      if (redirect) {
        logoutRedirectRef.current = redirect;
      }
      logoutUser.mutate(undefined);
    },
    [logoutUser],
  );

  const userQuery = useGetUserQuery({ enabled: !!(token ?? '') });

  const silentRefresh = useCallback(() => {
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping silent refresh.');
      return;
    }
    
    // Check if we have a token from account auth service
    const accountToken = localStorage.getItem('authToken');
    if (accountToken) {
      // We have a token from account auth service, don't try ChatUI refresh
      // Instead, trigger the tokenUpdated event to set up authentication
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: accountToken }));
      return;
    }
    
    refreshToken.mutate(undefined, {
      onSuccess: (data: t.TRefreshTokenResponse | undefined) => {
        const { user, token = '' } = data ?? {};
        if (token) {
          setUserContext({ token, isAuthenticated: true, user });
        } else {
          if (authConfig?.test === true) {
            return;
          }
          // Clean up tokens on refresh failure
          localStorage.removeItem('authToken');
          document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          redirectToAccountLogin('chat');
        }
      },
      onError: (error) => {
        if (authConfig?.test === true) {
          return;
        }
        // Clean up tokens on refresh error
        localStorage.removeItem('authToken');
        document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        redirectToAccountLogin('chat');
      },
    });
  }, []);

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    } else if (userQuery.isError) {
      doSetError((userQuery.error as Error).message);
      
      // Clean up tokens on user query error
      localStorage.removeItem('authToken');
      document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      redirectToAccountLogin('chat');
    }
    if (error != null && error && isAuthenticated) {
      doSetError(undefined);
    }
    if (token == null || !token || !isAuthenticated) {
      silentRefresh();
    }
  }, [
    token,
    isAuthenticated,
    userQuery.data,
    userQuery.isError,
    userQuery.error,
    error,
    setUser,
    navigate,
    silentRefresh,
    setUserContext,
  ]);

  useEffect(() => {
    const handleTokenUpdate = (event) => {
      const newToken = event.detail;
      
      try {
        // Decode JWT token to get user info
        const base64Url = newToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        
        // Create user object from token payload
        const userFromToken = {
          _id: payload.id,
          id: payload.id,
          email: payload.email,
          name: payload.name,
          username: payload.name || payload.email,
          role: payload.role || 'user',
          account_status: payload.account_status,
          avatar: '',
          provider: 'local',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUserContext({
          token: newToken,
          isAuthenticated: true,
          user: userFromToken,
        });
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        // Fallback to setting just the token
        setUserContext({
          token: newToken,
          isAuthenticated: true,
          user: user,
        });
      }
    };

    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [setUserContext]);

  // Make the provider update only when it should
  const memoedValue = useMemo(
    () => ({
      user,
      token,
      error,
      logout,
      setError,
      roles: {
        [SystemRoles.USER]: userRole,
        [SystemRoles.ADMIN]: adminRole,
      },
      isAuthenticated,
    }),

    [user, error, isAuthenticated, token, userRole, adminRole],
  );

  return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext should be used inside AuthProvider');
  }

  return context;
};

export { AuthContextProvider, useAuthContext, AuthContext };
