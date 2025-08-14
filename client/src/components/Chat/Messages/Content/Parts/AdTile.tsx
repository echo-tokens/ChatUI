import { memo, useState, useEffect } from 'react';
import { cn } from '~/utils';
import { useAuthContext } from '~/hooks/AuthContext';
import TaskComponent from './TaskTypes';

interface AdTileProps {
  link?: string;
  advertiser?: string;
  contextualized_ad?: string;
  task_id?: string;
  task_price_usd?: string;
  showCursor: boolean;
  clickable?: boolean;
  display_thumbs?: boolean;
}

const AdTile = memo(({ link, advertiser, contextualized_ad, task_id, task_price_usd, showCursor, clickable = true, display_thumbs = true }: AdTileProps) => {
  const { token } = useAuthContext();
  const [isVisible, setIsVisible] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isThankYouFading, setIsThankYouFading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackDisabled, setFeedbackDisabled] = useState(false);
  const [thumbsRating, setThumbsRating] = useState<'up' | 'down' | null>(null);
  const [positionRating, setPositionRating] = useState('');
  const [relevancyRating, setRelevancyRating] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [taskInfo, setTaskInfo] = useState<any>(null);
  const [showTask, setShowTask] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [showTaskThankYou, setShowTaskThankYou] = useState(false);
  const [taskSubmitted, setTaskSubmitted] = useState(false);

  // Animate the tile appearance only for new content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Use the provided props directly
  const linkUrl = link;
  const advertiserName = advertiser;
  const description = contextualized_ad;
  const taskId = task_id;
  const taskPrice = task_price_usd;

  const handleClick = () => {
    if (!clickable) return;
    
    if (linkUrl) {
      // Ensure URL has protocol (same as previous working implementation)
      const fullUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback for ads without links
      console.log('Ad clicked (no link):', description);
    }
  };

  const handleFeedbackSubmit = () => {
    console.log('Ad feedback submitted:', { positionRating, relevancyRating, feedbackText });
    
    // Step 1: Disable feedback and start submission
    setFeedbackDisabled(true);
    setIsSubmitting(true);
    
    // Step 2: Show thank you message below feedback (fades in)
    setShowThankYou(true);
    
    // Step 3: After thank you fades in completely, slide feedback up and fade out
    setTimeout(() => {
      setShowFeedback(false);
    }, 400);
    
    // Step 4: Keep thank you in place
    setTimeout(() => {
      setIsSubmitting(false);
    }, 700);
    
    // Step 5: Start fading out thank you message after 2 seconds
    setTimeout(() => {
      setIsThankYouFading(true);
    }, 2000);
    
    // Step 6: Hide thank you message after fade out completes
    setTimeout(() => {
      setShowThankYou(false);
      setIsThankYouFading(false);
    }, 2300);
    
    // Reset form data
    setPositionRating('');
    setRelevancyRating('');
    setFeedbackText('');
  };

  const handleTaskSubmit = async (result: any) => {
    console.log('Task submitted:', result);
    
    // Start fade out animation
    setIsSubmittingTask(true);
    
    try {
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      // Submit task result to backend
      if (!task_id) {
        console.error('No task ID provided for submission');
        return;
      }
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task_id,
          result: result
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const submitResult = await response.json();
      console.log('Task submission result:', submitResult);
      
      // Fade out task
      setShowTask(false);
      setIsSubmittingTask(false);
      setTaskInfo(null);
      
      // Mark task as submitted (permanent)
      setTaskSubmitted(true);
      
      // Show thank you message for 3 seconds
      setShowTaskThankYou(true);
      setTimeout(() => {
        setShowTaskThankYou(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting task:', error);
      setIsSubmittingTask(false);
    }
  };

  const handleTaskClose = () => {
    setShowTask(false);
    setTaskInfo(null);
  };




  return (
    <>
      <style>
        {`
          @keyframes fadeOut {
            from {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to {
              opacity: 0;
              transform: translateY(-20px) scale(1);
            }
          }
          

        `}
      </style>
      <div
        className={cn(
          'my-1 w-full rounded-lg not-prose ad-container',
          'border border-brand-purple/10 bg-brand-purple/[0.02] px-3 pt-0 pb-0',
          'dark:border-brand-purple/15 dark:bg-brand-purple/[0.03]',
          // Hover effects with subtle transitions
          clickable && 'cursor-pointer hover:bg-brand-purple/[0.04] hover:border-brand-purple/20 hover:shadow-sm dark:hover:bg-brand-purple/[0.06] dark:hover:border-brand-purple/25',
          'transition-colors transition-shadow duration-200 ease-in-out',
          isVisible ? 'opacity-100' : 'max-h-0 opacity-0'
        )}
        role="note"
        aria-label="Sponsored message"
        onClick={handleClick}
      >
              <div className="flex items-center gap-2">
          {false && (
            <div className="flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-gray-400 dark:text-gray-500 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {advertiserName && (
              <div className="mt-2 leading-none">
                <span className="text-gray-400 dark:text-gray-400 text-xs">
                  {"Ad:"}
                </span>
                <span className="text-gray-400 dark:text-gray-400 text-xs font-bold ml-1">
                  {advertiserName}
                </span>
              </div>
            )}
            {description && (
              <p className="text-gray-700 dark:text-gray-300 text-md leading-tight mt-2 mb-0">
                {description}
                {showCursor && (
                  <span className="animate-pulse">|</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        {/* Feedback buttons */}
        <div className="flex justify-end items-center gap-1 mt-2 -mr-1 mb-0.5" onClick={(e) => e.stopPropagation()}>
          {/* Task completion text */}
          {task_price_usd && task_id && !taskSubmitted && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (!token) {
                    console.error('No authentication token found');
                    return;
                  }

                  setIsLoadingTask(true);

                  // Call the task info endpoint
                  if (!task_id) {
                    console.error('No task ID provided');
                    return;
                  }
                  const response = await fetch(`/api/tasks/info/${task_id}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const taskInfoData = await response.json();
                  console.log('Task info retrieved:', taskInfoData);
                  
                  // Set the task info and show the task interface
                  setTaskInfo(taskInfoData);
                  setShowTask(true);
                  
                } catch (error) {
                  console.error('Error fetching task info:', error);
                } finally {
                  setIsLoadingTask(false);
                }
              }}
              className="text-xs text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:underline transition-colors cursor-pointer mr-2"
            >
              Earn ${parseFloat(task_price_usd || '0').toFixed(2)} by completing a short task
            </button>
          )}
          
          {/* Thumbs buttons */}
          {display_thumbs && (
            <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setThumbsRating('up');
                setShowFeedback(true);
              }}
              disabled={thumbsRating !== null}
              className={cn(
                "p-1 transition-colors",
                thumbsRating === null 
                  ? "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                  : thumbsRating === 'up'
                  ? "text-gray-800 dark:text-gray-200"
                  : "text-gray-300 dark:text-gray-600 opacity-50"
              )}
              title="Like this ad?"
            >
              <svg 
                className={cn(
                  "w-4 h-4",
                  thumbsRating === null ? "fill-none stroke-current" : "fill-current"
                )} 
                viewBox="0 0 20 20"
                strokeWidth={thumbsRating === null ? "1.5" : "0"}
              >
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setThumbsRating('down');
                setShowFeedback(true);
              }}
              disabled={thumbsRating !== null}
              className={cn(
                "p-1 transition-colors",
                thumbsRating === null 
                  ? "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                  : thumbsRating === 'down'
                  ? "text-gray-800 dark:text-gray-200"
                  : "text-gray-300 dark:text-gray-600 opacity-50"
              )}
              title="Don't like this ad?"
            >
              <svg 
                className={cn(
                  "w-4 h-4",
                  thumbsRating === null ? "fill-none stroke-current" : "fill-current"
                )} 
                viewBox="0 0 20 20"
                strokeWidth={thumbsRating === null ? "1.5" : "0"}
              >
                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
              </svg>
            </button>
          </div>
          )}
        </div>

        {/* Loading animation */}
        {isLoadingTask && (
          <div 
            className={cn(
              "mt-3 mb-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
              "transition-all duration-300 ease-in-out transform origin-top animate-fadeGrow"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Loading task information...
              </span>
            </div>
          </div>
        )}

        {/* Task Interface */}
        {showTask && taskInfo && (
          <div 
            className={cn(
              "mt-3 mb-3 transition-all duration-300 ease-in-out",
              isSubmittingTask ? "opacity-0 transform scale-95" : "opacity-100 transform scale-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskComponent
              taskInfo={taskInfo}
              onSubmit={handleTaskSubmit}
              onClose={handleTaskClose}
            />
          </div>
        )}

        {/* Task Thank You Message */}
        {showTaskThankYou && (
          <div 
            className="mt-3 mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2">
              <svg 
                className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Thank you! Your task has been submitted successfully.
              </span>
            </div>
          </div>
        )}

        {/* Feedback form */}
        {showFeedback && (
          <div 
            className={cn(
              "mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
              "transition-all duration-300 ease-in-out transform origin-top",
              isSubmitting ? "opacity-50 pointer-events-none" : "",
              feedbackDisabled ? "" : "animate-fadeGrow"
            )} 
            style={feedbackDisabled ? {
              animation: 'fadeOut 0.3s ease-in-out forwards'
            } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              {/* Position rating */}
              {false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How do you feel about the ad position?
                  </label>
                  <div className="flex gap-2">
                    {['Too early', 'Good timing', 'Too late'].map((option) => (
                      <button
                        key={option}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPositionRating(option);
                        }}
                        className={cn(
                          'px-3 py-1 text-xs rounded border transition-colors',
                          positionRating === option
                            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 border-gray-800 dark:border-gray-200'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Relevancy rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How relevant is this ad to you?
                </label>
                <div className="space-y-2">
                  {['Not relevant', 'Somewhat relevant', 'Very relevant'].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="relevancy"
                        value={option}
                        checked={relevancyRating === option}
                        onChange={(e) => {
                          e.stopPropagation();
                          setRelevancyRating(e.target.value);
                        }}
                        className="w-4 h-4 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-gray-800 dark:focus:ring-gray-200"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What are your thoughts on this product?
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFeedbackSubmit();
                      }
                    }}
                    disabled={feedbackDisabled}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={2}
                    placeholder="Share your thoughts..."
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeedbackSubmit();
                    }}
                    disabled={feedbackDisabled}
                    className="px-4 py-2 bg-gray-500 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded hover:bg-gray-600 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thank you message */}
        {showThankYou && (
          <div 
            className={cn(
              "mt-3 mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg",
              "transition-all duration-300 ease-in-out",
              isThankYouFading ? "opacity-0" : "opacity-100"
            )}
            style={{
              zIndex: 20
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Thank you for your feedback!
              </span>
            </div>
          </div>
                )}
      </div>


    </>
  );
});

export default AdTile; 