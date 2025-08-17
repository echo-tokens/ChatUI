import React from 'react';
import { RecoilRoot } from 'recoil';
import { DndProvider } from 'react-dnd';
import { RouterProvider } from 'react-router-dom';
import * as RadixToast from '@radix-ui/react-toast';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ScreenshotProvider, ThemeProvider, useApiErrorBoundary } from './hooks';
import { ToastProvider } from './Providers';
import Toast from './components/ui/Toast';
import { LiveAnnouncer } from '~/a11y';
import { router } from './routes';
import { redirectToAccountLogin } from './utils/authRedirect';

const App = () => {
  const { setError } = useApiErrorBoundary();

  // Handle cookie-to-localStorage transfer on app load
  React.useEffect(() => {
    // Helper function to get cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // Check for chatAuthToken cookie and transfer to localStorage if needed
    const cookieToken = getCookie('chatAuthToken');
    const localStorageToken = localStorage.getItem('authToken');

    console.log('App: Initial auth check - cookieToken:', !!cookieToken, 'localStorageToken:', !!localStorageToken);

    if (cookieToken && !localStorageToken) {
      console.log('App: Found chatAuthToken cookie, transferring to localStorage');
      localStorage.setItem('authToken', cookieToken);
      
      // Trigger the tokenUpdated event to set up authentication
      console.log('App: Dispatching tokenUpdated event');
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: cookieToken }));
    } else if (cookieToken && localStorageToken) {
      console.log('App: Both cookie and localStorage have tokens - clearing cookie to prevent conflicts');
      // Clear the cookie to prevent conflicts
      document.cookie = 'chatAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, []);

  // Add event listener for account auth redirects
  React.useEffect(() => {
    const handleRedirectToAccountLogin = (event) => {
      console.log('App: Received redirectToAccountLogin event, type:', event.detail);
      redirectToAccountLogin(event.detail);
    };

    window.addEventListener('redirectToAccountLogin', handleRedirectToAccountLogin);
    
    return () => {
      window.removeEventListener('redirectToAccountLogin', handleRedirectToAccountLogin);
    };
  }, []);

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error?.response?.status === 401) {
          setError(error);
        }
      },
    }),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <LiveAnnouncer>
          <ThemeProvider>
            <RadixToast.Provider>
              <ToastProvider>
                <DndProvider backend={HTML5Backend}>
                  <RouterProvider router={router} />
                  <ReactQueryDevtools initialIsOpen={false} position="top-right" />
                  <Toast />
                  <RadixToast.Viewport className="pointer-events-none fixed inset-0 z-[1000] mx-auto my-2 flex max-w-[560px] flex-col items-stretch justify-start md:pb-5" />
                </DndProvider>
              </ToastProvider>
            </RadixToast.Provider>
          </ThemeProvider>
        </LiveAnnouncer>
      </RecoilRoot>
    </QueryClientProvider>
  );
};

export default () => (
  <ScreenshotProvider>
    <App />
    <iframe
      src="/assets/silence.mp3"
      allow="autoplay"
      id="audio"
      title="audio-silence"
      style={{
        display: 'none',
      }}
    />
  </ScreenshotProvider>
);
