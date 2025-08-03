import React, { useState } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import TaskEarningsDashboard from '~/components/Earnings/TaskEarningsDashboard';
import TasksView from '~/components/Earnings/TasksView';
import OpenSidebar from '~/components/Chat/Menus/OpenSidebar';
import Nav from '~/components/Nav/Nav';

type ViewState = 'dashboard' | 'tasks';

export default function EarnRoute() {
  const { user: authUser, isAuthenticated } = useAuthContext();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    return savedNavVisible !== null ? JSON.parse(savedNavVisible) : true;
  });

  if (!isAuthenticated) {
    window.location.href = '/login';
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
      <div className="flex h-full">
        <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
        <div className="relative flex-1">
          <div className="absolute top-4 left-4 z-50">
            <OpenSidebar setNavVisible={setNavVisible} />
          </div>
          <TasksView 
            user={authUser}
            onBack={handleBackToDashboard}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
      <div className="relative flex-1">
        <div className="absolute top-4 left-4 z-50">
          <OpenSidebar setNavVisible={setNavVisible} />
        </div>
        <TaskEarningsDashboard 
          user={authUser}
          onStartTasks={handleStartTasks}
        />
      </div>
    </div>
  );
}