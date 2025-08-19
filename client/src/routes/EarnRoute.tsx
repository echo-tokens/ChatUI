import React, { useState } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import TaskEarningsDashboard from '~/components/Earnings/TaskEarningsDashboard';
import TasksView from '~/components/Earnings/TasksView';
import { redirectToAccountLogin } from '~/utils/authRedirect';

type ViewState = 'dashboard' | 'tasks';

export default function EarnRoute() {
  const { user: authUser, isAuthenticated } = useAuthContext();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  if (!isAuthenticated) {
    console.log('EarnRoute: User not authenticated, redirecting to account login');
    redirectToAccountLogin('chat');
    return null;
  }

  const handleStartTasks = () => {
    setCurrentView('tasks');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (currentView === 'tasks') {
    return (
      <div className="h-full">
        <TasksView 
          user={authUser}
          onBack={handleBackToDashboard}
        />
      </div>
    );
  }

  return (
    <div className="h-full">
      <TaskEarningsDashboard 
        user={authUser}
        onStartTasks={handleStartTasks}
      />
    </div>
  );
}