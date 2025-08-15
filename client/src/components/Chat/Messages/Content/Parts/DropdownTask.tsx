import { memo, useState, useEffect } from 'react';
import { cn } from '~/utils';
import AdTile from './AdTile';
import { useAuthContext } from '~/hooks/AuthContext';
import { SelectionMethod } from './AdOrTaskTile';

interface ParsedAdData {
  task?: {
    id: string;
    price_usd: string;
    instructions: string;
    selection_method: SelectionMethod;
    dropdown_options?: Array<string>;
  };
  ads?: Array<{
    clickthrough_link: string;
    advertiser: string;
    contextualized_ad: string;
  }>;
  ui_display?: string;
}

interface DropdownTaskProps {
  adData: ParsedAdData;
  showCursor: boolean;
}

const DropdownTask = memo(({ adData, showCursor }: DropdownTaskProps) => {
  const { token } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [showTask, setShowTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [freeResponseText, setFreeResponseText] = useState<string>('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmittingAnimation, setIsSubmittingAnimation] = useState(false);
  const [showSubmitThankYou, setShowSubmitThankYou] = useState(false);
  const [previousState, setPreviousState] = useState<'unloaded' | 'incomplete' | 'complete'>('unloaded');
  const [taskState, setTaskState] = useState<'unloaded' | 'incomplete' | 'complete'>('unloaded');
  const [showPulse, setShowPulse] = useState(false);
  const [showEarnedText, setShowEarnedText] = useState(false);
  const [progress, setProgress] = useState(0);

  // Check task completion status on component load
  useEffect(() => {
    const checkTaskCompletion = async () => {
      if (!adData.task?.id || !token) return;
      
      try {
        const response = await fetch(`/api/tasks/completion/${adData.task.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.completed && data.user_submission) {
            setTaskCompleted(true);
            // Set the selected options from user submission
            if (Array.isArray(data.user_submission) && data.user_submission.length > 0) {
              setSelectedOptions(new Set(data.user_submission));
            }
            setPreviousState('complete');
            setTaskState('complete');
            setShowEarnedText(true);
          } else {
            setPreviousState('incomplete');
            setTaskState('incomplete');
          }
        } else {
          setPreviousState('unloaded');
          setTaskState('unloaded');
        }
      } catch (error) {
        console.error('Error checking task completion:', error);
        setPreviousState('unloaded');
        setTaskState('unloaded');
      } finally {
        setIsLoading(false);
      }
    };

    checkTaskCompletion();
  }, [adData.task?.id, token]);

  // Progress bar effect - 5 seconds
  useEffect(() => {
    if (!showTask) return; // Only run when task is shown
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsLoading(false);
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // 2% every 100ms = 5 seconds total
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showTask]);

  const handleTaskClick = () => {
    if (taskCompleted) return;
    setShowTask(true);
    setProgress(0); // Reset progress bar when opening
    setIsLoading(true); // Start loading state
  };

  const handleTaskSubmit = async () => {
    if (!adData.task?.id || !token) return;
    
    // Check if we have valid input based on selection method
    const selectionMethod = adData.task.selection_method;
    let hasValidInput = false;
    let result: any = [];
    
    if (selectionMethod === 'pick_one') {
      hasValidInput = selectedOptions.size > 0;
      result = Array.from(selectedOptions);
    } else if (selectionMethod === 'pick_multiple') {
      hasValidInput = true;
      result = Array.from(selectedOptions);
    } else if (selectionMethod === 'likert') {
      hasValidInput = selectedOptions.size > 0;
      result = Array.from(selectedOptions);
    } else if (selectionMethod === 'free_response') {
      hasValidInput = freeResponseText.trim().length > 0;
      result = [freeResponseText.trim()];
    } else if (selectionMethod === 'insertion_location') {
      hasValidInput = true; // For now, always allow submission
      result = [];
    }
    
    if (!hasValidInput) return;
    
    setIsSubmitting(true);
    setIsSubmittingAnimation(true);
    
    try {
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: adData.task.id,
          result: result
        }),
      });

      if (response.ok) {
        console.log('Task submission successful');
        setTaskCompleted(true);
        setTaskState('complete');
        
        // Start pulse animation immediately and change to +$price text
        setShowPulse(true);
        setShowEarnedText(true);
        
        // Stop pulse animation after 1.5 seconds but keep the +$price text
        setTimeout(() => {
          setShowPulse(false);
        }, 1500);
        
        // After submit animation completes (500ms), show thank you message
        setTimeout(() => {
          setShowSubmitThankYou(true);
          setIsSubmittingAnimation(false);
          
          // After 2 seconds, start closing animation
          setTimeout(() => {
            setIsClosing(true);
            
            // After close animation completes (1000ms), clean up
            setTimeout(() => {
              setShowTask(false);
              setIsClosing(false);
              setShowSubmitThankYou(false);
              setSelectedOptions(new Set());
              setFreeResponseText('');
            }, 1000);
          }, 2000);
        }, 500);
        
      } else {
        console.error('Task submission failed');
        setIsSubmittingAnimation(false);
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      setIsSubmittingAnimation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowTask(false);
      setIsClosing(false);
      setSelectedOptions(new Set());
      setFreeResponseText('');
    }, 1000); // Match the animation duration
  };

  // If no ads available, return null
  if (!adData.ads || adData.ads.length === 0) {
    return null;
  }

  const ad = adData.ads[0]; // Use the first ad

  // Create the task interface component
  const taskInterface = (showTask || isClosing) && adData.task ? (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-lg border-t-4 border-r border-b border-l border-gray-200 dark:border-gray-700 p-3 relative",
      "transition-all duration-300 ease-in-out transform origin-top",
      isSubmitting ? "opacity-50 pointer-events-none" : "opacity-100",
      isSubmittingAnimation ? "scale-95 opacity-0" : "scale-100 opacity-100"
    )}>
      {/* Top border progress indicator */}
      <div className={cn(
        "absolute -top-1 left-0 h-2 transition-all duration-100 ease-linear",
        progress >= 100 ? "rounded-tr-xl bg-gray-300 dark:bg-gray-400" : "bg-gray-200 dark:bg-gray-300"
      )}
           style={{ 
             width: `${progress}%`,
             borderTopLeftRadius: '100px',
             borderTopRightRadius: progress >= 100 ? '100px' : '0px'
           }} />
      <div>
        {/* Reward and Instructions */}
        <div className="flex items-center gap-3 mb-3 overflow-x-visible">
          {adData.task?.price_usd && (
            <div className="relative">
              <span className={cn(
                "text-sm font-bold text-gray-700 dark:text-gray-300 min-w-fit whitespace-nowrap bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded px-2 py-1 transition-all duration-1000 relative z-10",
                showPulse && "animate-pulse scale-125 shadow-lg"
              )}>
                {showEarnedText ? `+$${parseFloat(adData.task.price_usd).toFixed(2)}` : `Earn $${parseFloat(adData.task.price_usd).toFixed(2)}`}
              </span>
              {/* Radiating circles */}
              {showPulse && (
                <>
                  <div className="absolute -inset-2 rounded border-2 border-green-400 animate-ping opacity-75"></div>
                  <div className="absolute -inset-2 rounded border-2 border-green-300 animate-ping opacity-50" style={{ animationDelay: '0.2s' }}></div>
                  <div className="absolute -inset-2 rounded border-2 border-green-200 animate-ping opacity-25" style={{ animationDelay: '0.4s' }}></div>
                </>
              )}
            </div>
          )}
          {adData.task?.instructions && (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {adData.task.instructions}
            </span>
          )}
        </div>

        {/* Thank you message - appears below instructions */}
        {showSubmitThankYou && (
          <div className="flex items-center justify-center py-4 mb-3">
            <div className="text-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Thank you!
              </h3>
            </div>
          </div>
        )}

        {/* Options and Submit Button - Only shown when not in thank you state */}
        {!showSubmitThankYou && (
          <>
            {/* Dynamic content based on selection method */}

        {/* Dynamic content based on selection method */}
        {adData.task.dropdown_options && adData.task.dropdown_options.length > 0 && (
          <div className="mb-3">
            {adData.task.selection_method === 'pick_one' && (
              <div className="space-y-2">
                {adData.task.dropdown_options.map((option: string, index: number) => (
                  <label key={index} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="task-option"
                      value={option}
                      checked={selectedOptions.has(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOptions(new Set([option]));
                        }
                      }}
                      className="w-4 h-4 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 checked:bg-gray-600 checked:border-gray-600 dark:checked:bg-gray-400 dark:checked:border-gray-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {adData.task.selection_method === 'pick_multiple' && (
              <div className="space-y-2">
                {adData.task.dropdown_options.map((option: string, index: number) => (
                  <label key={index} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      value={option}
                      checked={selectedOptions.has(option)}
                      onChange={(e) => {
                        const newSelection = new Set(selectedOptions);
                        if (e.target.checked) {
                          newSelection.add(option);
                        } else {
                          newSelection.delete(option);
                        }
                        setSelectedOptions(newSelection);
                      }}
                      className="w-4 h-4 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 checked:bg-gray-600 checked:border-gray-600 dark:checked:bg-gray-400 dark:checked:border-gray-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {adData.task.selection_method === 'likert' && (
              <div className="mb-3">
                <div className="flex justify-between items-stretch gap-2">
                  {adData.task.dropdown_options?.map((option: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedOptions(new Set([option]))}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 min-h-[3.5rem] transition-all duration-200",
                        selectedOptions.has(option)
                          ? "border-2 border-gray-700 dark:border-gray-300 bg-gray-50 dark:bg-gray-800/20"
                          : "border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 text-center leading-tight">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Free response - doesn't require dropdown options */}
        {adData.task.selection_method === 'free_response' && (
          <div className="mb-3">
            <textarea
              value={freeResponseText}
              onChange={(e) => setFreeResponseText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSubmitting && !isLoading && freeResponseText.trim().length > 0) {
                    handleTaskSubmit();
                  }
                }
              }}
              placeholder="Enter your response..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none min-h-[100px] focus:outline-none"
              rows={4}
            />
          </div>
        )}
        
        {/* Insertion location - doesn't require dropdown options */}
        {adData.task.selection_method === 'insertion_location' && (
          <div className="mb-3 text-center py-4 text-gray-500 dark:text-gray-400">
            <p>Insertion location task - no input required</p>
          </div>
        )}

                    {/* Action buttons */}
            <div className="flex gap-2 justify-end -mt-1">
              <button
                onClick={handleTaskSubmit}
                disabled={
                  isSubmitting || 
                  isLoading ||
                  (adData.task.selection_method === 'pick_one' && selectedOptions.size === 0) ||
                  (adData.task.selection_method === 'likert' && selectedOptions.size === 0) ||
                  (adData.task.selection_method === 'free_response' && freeResponseText.trim().length === 0)
                }
                className={cn(
                  'px-4 py-1 rounded-md font-medium transition-colors',
                  (adData.task.selection_method === 'pick_one' && selectedOptions.size === 0) ||
                  (adData.task.selection_method === 'likert' && selectedOptions.size === 0) ||
                  (adData.task.selection_method === 'free_response' && freeResponseText.trim().length === 0) ||
                  isSubmitting ||
                  isLoading
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                )}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={handleTaskClose}
                disabled={isSubmitting}
                className="px-4 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  // If no ads available, return null
  if (!adData.ads || adData.ads.length === 0) {
    return null;
  }

  // Show the ad with dropdown task interface
  if (previousState === 'incomplete') {
    return (
      <div className="relative">
        {/* AdTile wrapper */}
        <div className="relative">
          <AdTile
            link={ad.clickthrough_link}
            advertiser={ad.advertiser}
            contextualized_ad={ad.contextualized_ad}
            task_id={adData.task?.id}
            task_price_usd={adData.task?.price_usd}
            showCursor={showCursor}
            clickable={true}
            display_thumbs={true}
            onTaskClick={handleTaskClick}
            dropdownComponent={taskInterface}
            isDropdownClosing={isClosing}
            taskState={taskState}
          />
          

        </div>

        {/* Thank you message */}
        {showThankYou && (
          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Thank you! Your task has been submitted successfully.
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If task was already completed, show the ad without dropdown
  if (previousState === 'complete') {
    return (
      <div className="relative">
        <AdTile
          link={ad.clickthrough_link}
          advertiser={ad.advertiser}
          contextualized_ad={ad.contextualized_ad}
          task_id={adData.task?.id}
          task_price_usd={adData.task?.price_usd}
          showCursor={showCursor}
          clickable={true}
          display_thumbs={true}
          onTaskClick={handleTaskClick}
          dropdownComponent={null}
          isDropdownClosing={false}
          taskState={taskState}
        />
      </div>
    );
  }

  // If still loading or unloaded, return null
  if (previousState === 'unloaded') {
    return null;
  }

  return null;
});

export default DropdownTask;
