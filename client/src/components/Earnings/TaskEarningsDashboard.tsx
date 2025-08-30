import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, DollarSign, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '~/utils';
import { Button, TooltipAnchor } from '~/components/ui';
import DataSharingAgreementModal from './DataSharingAgreementModal';
import { useAuthContext } from '~/hooks/AuthContext';
import { request } from 'librechat-data-provider';

interface TaskStats {
  tasks_completed: number;
  total_earnings: number;
  available_tasks: number;
}

interface TaskEarningsDashboardProps {
  user?: any;
  className?: string;
  onStartTasks: () => void;
}

export default function TaskEarningsDashboard({ 
  user, 
  className, 
  onStartTasks 
}: TaskEarningsDashboardProps) {
  const { token } = useAuthContext();
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isDataSharingEnrolled, setIsDataSharingEnrolled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [dataSharingError, setDataSharingError] = useState<string | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [dataSharingStatusLoaded, setDataSharingStatusLoaded] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([
          loadTaskData(),
          checkDataSharingEnrollment()
        ]);
        setIsLoading(false);
      };
      loadData();
    }
  }, [user]);

  const loadTaskData = async () => {
    try {
      setStatsError(null);
      setStatsLoaded(false);
      const data = await request.get(`/api/tasks/stats/${user._id}`) as any;
      setTaskStats(data);
      setStatsLoaded(true);
    } catch (error) {
      console.error('Error loading task data:', error);
      setStatsError('Failed to load task statistics. Please check your connection and try again.');
      setTaskStats(null);
      setStatsLoaded(false);
    }
  };

  const checkDataSharingEnrollment = async () => {
    try {
      setDataSharingError(null);
      setDataSharingStatusLoaded(false);

      const data = await request.get(`/api/tasks/data-sharing-status/${user._id}`) as any;
      setIsDataSharingEnrolled(data.enrolled);
      setDataSharingStatusLoaded(true);
    } catch (error) {
      console.error('Error checking data sharing enrollment:', error);
      setDataSharingError('Failed to check data sharing enrollment status. Please refresh the page.');
      setIsDataSharingEnrolled(false);
      setDataSharingStatusLoaded(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleStartTasks = async () => {
    if (!dataSharingStatusLoaded || !isDataSharingEnrolled) {
      return; // Button should be disabled in this case
    }

    if (!statsLoaded || !taskStats || taskStats.available_tasks === 0) {
      return; // Button should be disabled in this case
    }

    onStartTasks();
  };

  const handleEnrollDataSharing = () => {
    setAgreementError(null);
    setShowAgreementModal(true);
  };

  const handleAcceptAgreement = async () => {
    try {
      setAgreementError(null);
      await request.post(`/api/tasks/accept-data-sharing/${user._id}`, {});

      setIsDataSharingEnrolled(true);
      setDataSharingStatusLoaded(true);
      setDataSharingError(null);
      // Refresh task data after enrollment
      await loadTaskData();
    } catch (error) {
      console.error('Error accepting data sharing agreement:', error);
      setAgreementError('Failed to accept data sharing agreement. Please try again.');
    }
  };

  if (isLoading || (!statsLoaded && !statsError) || (!dataSharingStatusLoaded && !dataSharingError)) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-4xl mx-auto min-h-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 flex items-center', className)}>
      <div className="max-w-6xl mx-auto p-6 space-y-6 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Earn Money by Completing Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Complete simple data tasks and get paid directly. Your contributions help improve AI systems 
            while you earn real money for your time and effort.
          </p>
        </div>

        {/* Data Sharing Status */}
        {dataSharingStatusLoaded && !isDataSharingEnrolled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                Data Sharing Agreement Required
              </h3>
            </div>
            <p className="text-yellow-800 dark:text-yellow-200 mb-4">
              To start earning from tasks, you need to enroll in our data sharing agreement. 
              This ensures your privacy is protected while allowing you to participate in our earning program.
            </p>
            <Button 
              onClick={handleEnrollDataSharing}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Review Data Sharing Agreement
            </Button>
          </div>
        )}

        {/* Data Sharing Error */}
        {dataSharingError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{dataSharingError}</p>
              </div>
              <Button
                onClick={() => {
                  if (user) {
                    checkDataSharingEnrollment();
                  }
                }}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Stats Error */}
        {statsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{statsError}</p>
              </div>
              <Button
                onClick={() => {
                  if (user) {
                    loadTaskData();
                  }
                }}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Task Statistics */}
        {statsLoaded && taskStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between h-32">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="font-medium text-gray-900 dark:text-white">Tasks Completed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {taskStats.tasks_completed}
              </div>
            </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between h-32">
            <div className="flex items-start gap-3">
              <Play className="h-5 w-5 text-orange-500 mt-0.5" />
              <span className="font-medium text-gray-900 dark:text-white">Available Tasks</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {taskStats.available_tasks}
            </div>
          </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between h-32">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-blue-500 mt-0.5" />
                <span className="font-medium text-gray-900 dark:text-white">Total Earnings</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(taskStats.total_earnings)}
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How Task Earning Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Get a Task</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We'll assign you a simple data task based on your skills and availability.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">2</span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Complete It</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Follow the instructions and submit your work. Most tasks take just a couple of minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 dark:text-purple-400 font-bold">3</span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Get Paid</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Earn money directly for each completed task. Payments are processed weekly.
              </p>
            </div>
          </div>
        </div>

        {/* Start Tasks Button */}
        <div className="text-center">
          {(() => {
            const isDisabled = 
              !dataSharingStatusLoaded || 
              !isDataSharingEnrolled || 
              !statsLoaded || 
              !taskStats || 
              (taskStats && taskStats.available_tasks === 0) || 
              !!statsError || 
              !!dataSharingError;

            const getTooltipText = () => {
              if (!dataSharingStatusLoaded) {
                return 'Loading data sharing status...';
              }
              if (!isDataSharingEnrolled) {
                return 'You must be enrolled in the data sharing agreement to start tasks.';
              }
              if (dataSharingError || statsError) {
                return 'Please fix the errors above to continue.';
              }
              if (!statsLoaded || !taskStats) {
                return 'Loading task data...';
              }
              if (taskStats.available_tasks === 0) {
                return 'No tasks are currently available.';
              }
              return '';
            };

            const button = (
              <Button
                onClick={handleStartTasks}
                disabled={isDisabled}
                size="lg"
                className={cn(
                  'px-8 py-3 text-lg font-medium',
                  !isDisabled
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                )}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Tasks
              </Button>
            );

            if (isDisabled && getTooltipText()) {
              return (
                <TooltipAnchor description={getTooltipText()} side="top">
                  {button}
                </TooltipAnchor>
              );
            }

            return button;
          })()}
          
          {dataSharingStatusLoaded && isDataSharingEnrolled && statsLoaded && taskStats && taskStats.available_tasks === 0 && !statsError && !dataSharingError && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Check back later for new tasks or complete your profile to unlock more opportunities.
            </p>
          )}
        </div>
      </div>

      {/* Data Sharing Agreement Modal */}
      <DataSharingAgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        onAgree={handleAcceptAgreement}
        user={user}
        error={agreementError}
      />
    </div>
  );
}