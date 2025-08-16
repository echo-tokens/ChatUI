import React from 'react';
import { useApiErrorBoundary } from '~/hooks/ApiErrorBoundaryContext';
import { redirectToAccountLogin } from '~/utils/authRedirect';

const ApiErrorWatcher = () => {
  const { error } = useApiErrorBoundary();
  
  React.useEffect(() => {
    if (error?.response?.status === 500) {
      // Redirect to account auth service on server errors
      redirectToAccountLogin('chat');
    }
  }, [error]);

  return null;
};

export default ApiErrorWatcher;
