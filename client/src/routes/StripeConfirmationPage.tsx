import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function StripeConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuthContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'updating'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const connectStripeAccount = async () => {
      if (status === 'updating') {
        return;
      }

      if (!isAuthenticated || !authUser) {
        setStatus('error');
        setErrorMessage('User not authenticated');
        return;
      }

      function getTokenFromCookie() {
        const token = document.cookie.split('; ').find(row => row.startsWith('chatAuthToken='));
        return token ? token.split('=')[1] : null;
      }

      const token = getTokenFromCookie();
      if (!token) {
        setStatus('error');
        setErrorMessage('No token found in cookie');
        return;
      }

      const state = searchParams.get('state');
      if (!state) {
        setStatus('error');
        setErrorMessage('No state received from Stripe');
        return;
      }

      if (state !== token) {
        setStatus('error');
        setErrorMessage('State mismatch');
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received from Stripe');
        return;
      }

      try {
        setStatus('updating');
        const response = await fetch('/api/stripe/connect-stripe-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: authUser.id,
            code: code,
          }),
        });

        if (response.ok) {
          setStatus('success');
          // Clear the URL parameters to prevent code reuse
          window.history.replaceState({}, document.title, window.location.pathname);
          // Redirect to earnings page after 3 seconds
          setTimeout(() => {
            navigate('/earnings');
          }, 3000);
        } else {
          const errorData = await response.json();
          
          // Handle the case where the code was already used (account already connected)
          if (errorData.error && errorData.error.includes('already been used')) {
            setStatus('success');
            setErrorMessage('Stripe account already connected successfully!');
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Redirect to earnings page after 3 seconds
            setTimeout(() => {
              navigate('/earnings');
            }, 3000);
          } else {
            setStatus('error');
            setErrorMessage(errorData.error || 'Failed to connect Stripe account');
          }
        }
      } catch (error) {
        console.error('Error connecting Stripe account:', error);
        setStatus('error');
        setErrorMessage('Network error occurred while connecting Stripe account');
      }
    };

    connectStripeAccount();
  }, [searchParams, authUser, isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to complete Stripe setup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connecting Stripe Account
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we connect your Stripe account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Stripe Account Connected!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your Stripe account has been successfully connected. You can now collect your earnings.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to earnings page...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connection Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/earnings')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Return to Earnings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
