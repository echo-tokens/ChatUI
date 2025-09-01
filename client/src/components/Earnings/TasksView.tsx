import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import AdPlacementAndDescriptionTaskView from './AdPlacementAndDescriptionTaskView';
import { useAuthContext } from '~/hooks/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { request } from 'librechat-data-provider';
import type { ContextType } from '~/common';

interface Task {
  id: string;
  task_type: 'ad_placement_and_description' | 'ad_feedback';
  task_title: string;
  description: string;
  instructions: string;
  estimated_time_minutes: number;
  reward_amount: number;
  data: any;
  minimum_trust_level: number;
}

interface TaskSubmission {
  task_id: string;
  response: any;
}

interface TasksViewProps {
  user?: any;
  onBack: () => void;
  className?: string;
}

export default function TasksView({ user, onBack, className }: TasksViewProps) {
  const { token } = useAuthContext();
  const { navVisible } = useOutletContext<ContextType>();
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskResponse, setTaskResponse] = useState<any>({});
  const [popupError, setPopupError] = useState<string | null>(null);
  const taskViewRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      claimAndLoadTask();
    }
  }, [user]);

  const claimAndLoadTask = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await request.post(`/api/tasks/claim-and-load/${user.id}`, {});

      if (response && response.status === 301) {
        setError('No tasks are currently available for you. Please check back later.');
        setCurrentTask(null);
        return;
      }

      setCurrentTask(response);
      setTaskResponse({});
    } catch (error) {
      console.error('Error loading task:', error);
      setError('Failed to load task. Please check your connection and try again.');
      setCurrentTask(null);
    } finally {
      setIsLoading(false);
    }
  };

  const submitTask = async () => {
    if (!currentTask) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Get the current task response data from the task view
      let currentTaskResponse = taskResponse;
      if (taskViewRef.current && taskViewRef.current.setAndCheckTaskResponse) {
        currentTaskResponse = await taskViewRef.current.setAndCheckTaskResponse();
      }

      const submission: TaskSubmission = {
        task_id: currentTask.id,
        response: currentTaskResponse
      };

      await request.post('/api/tasks/submit', submission);

      // Task submitted successfully, try to load next task
      await claimAndLoadTask();
    } catch (error) {
      console.error('Error submitting task:', error);
      setError('Failed to submit task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTaskContent = () => {
    if (!currentTask) return null;

    switch (currentTask.task_type) {
      case 'ad_placement_and_description':
        return (
          <AdPlacementAndDescriptionTaskView 
            ref={taskViewRef}
            task={currentTask}
            onSubmit={submitTask}
            isSubmitting={isSubmitting}
            taskResponse={taskResponse}
            setTaskResponse={setTaskResponse}
          />
        );

      case 'ad_feedback':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Data to enter:</h4>
              <p className="text-gray-700 dark:text-gray-300">{currentTask.data.source_text}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter the extracted information:
              </label>
              <textarea
                value={taskResponse.extracted_data || ''}
                onChange={(e) => setTaskResponse({ ...taskResponse, extracted_data: e.target.value })}
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter the required information here..."
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Unknown task type</p>
          </div>
        );
    }
  };

  const isSubmitDisabled = () => {
    if (!currentTask || isSubmitting) return true;
    return false;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-4xl mx-auto min-h-full flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your next task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentTask) {
    return (
      <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6', className)}>
        <div className="max-w-4xl mx-auto min-h-full">
          <div className="mb-6">
            <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Tasks Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{error}</p>
            <Button onClick={claimAndLoadTask} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Check for New Tasks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-y-auto bg-gray-50 dark:bg-gray-900', className)}>
      <div className="w-4/5 max-w-6xl mx-auto p-6 space-y-6 min-h-full">
        {/* Task Info */}
        {currentTask && (
          <div className="flex items-center justify-end gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              ~{currentTask.estimated_time_minutes} min
            </div>
            <div className="flex items-center gap-1">
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1">
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  {formatCurrency(currentTask.reward_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Task Content */}
        {currentTask && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {currentTask.task_title}
              </h1>
              {/* <p className="text-gray-600 dark:text-gray-300 mb-4">
                {currentTask.description}
              </p> */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Instructions:</h3>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{currentTask.instructions}</div>
              </div>
            </div>

            {renderTaskContent()}

            {/* Submit Button */}
            <div className="mt-4 flex justify-center">
              <Button
                onClick={async () => {
                  try {
                    if (taskViewRef.current && taskViewRef.current.setAndCheckTaskResponse) {
                      await taskViewRef.current.setAndCheckTaskResponse();
                    }
                    await submitTask();
                  } catch (error) {
                    setPopupError(error instanceof Error ? error.message : 'An error occurred while submitting the task.');
                  }
                }}
                disabled={isSubmitDisabled()}
                size="lg"
                className={cn(
                  'px-8 py-3 text-lg font-medium flex items-center gap-2',
                  isSubmitDisabled()
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Task
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error Popup */}
      {popupError && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{
            marginLeft: navVisible ? (typeof window !== 'undefined' && window.innerWidth <= 768 ? 320 : 260) + 'px' : '0px',
            width: `calc(100vw - ${navVisible ? (typeof window !== 'undefined' && window.innerWidth <= 768 ? 320 : 260) : 0}px)`,
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-auto shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Submission Error
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {popupError}
            </p>
            <div className="flex justify-end">
              <Button
                onClick={() => setPopupError(null)}
                className="bg-blue-600 hover:bg-blue-700 min-w-[80px]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}