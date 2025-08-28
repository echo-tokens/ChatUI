import { memo, useState, useEffect } from 'react';
import { cn } from '~/utils';
import AdTile from './AdTile';
import { useAuthContext } from '~/hooks/AuthContext';
import useToast from '~/hooks/useToast';
import { NotificationSeverity } from '~/common';
import { useQueryClient } from '@tanstack/react-query';
import { SelectionMethod, InlineSelectionMethod } from './AdOrTaskTile';

interface ParsedAdData {
  task?: {
    id: string;
    price_usd: string;
    instructions?: string;
    selection_method: SelectionMethod;
  };
  ads?: Array<{
    clickthrough_link: string;
    advertiser: string;
    contextualized_ad: string;
  }>;
  ui_display?: string;
}

interface InlinePreferenceTaskProps {
  adData: ParsedAdData;
  isStreaming: boolean;
}

const InlinePreferenceTask = memo(({ adData, isStreaming }: InlinePreferenceTaskProps) => {
  const { token, user } = useAuthContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAds, setSelectedAds] = useState<Set<number>>(new Set());
  const [hasSelection, setHasSelection] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [previousState, setPreviousState] = useState<'unloaded' | 'incomplete' | 'complete'>('unloaded');
  const [randomSelectedAd, setRandomSelectedAd] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showChosenAd, setShowChosenAd] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const selection_method = (adData.task?.selection_method as InlineSelectionMethod) || 'pick_one';

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
            // Task is completed, set the selected ads from user submission
            // Handle both old format (array of indices) and new format (array of objects with selection_index)
            let selectedIndices: number[] = [];
            if (Array.isArray(data.user_submission)) {
              if (typeof data.user_submission[0] === 'object' && data.user_submission[0]?.selection_index !== undefined) {
                // New format: array of objects with selection_index
                selectedIndices = data.user_submission.map((item: any) => item.selection_index).filter((index: number) => index !== null && index !== undefined);
              } else {
                // Old format: array of indices
                selectedIndices = data.user_submission.filter((index: number) => index !== null && index !== undefined);
              }
            }
            setSelectedAds(new Set(selectedIndices));
            setHasSelection(selectedIndices.length > 0);
            setTaskCompleted(true);
            setPreviousState('complete');
          } else {
            setPreviousState('incomplete');
          }
        } else {
          setPreviousState('unloaded');
        }
      } catch (error) {
        console.error('Error checking task completion:', error);
        setPreviousState('unloaded');
      }
    };

    checkTaskCompletion();
  }, [adData.task?.id, token]);

  // Progress bar effect - 5 seconds
  useEffect(() => {
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
  }, []);

  const handleAdSelect = (index: number) => {
    if (isLoading || taskCompleted) return; // Prevent selection while loading or if task is completed
    
    setIsAnimating(true);
    
    if (selection_method === 'pick_one' || selection_method === 'AB_click') {
      // Single selection - replace current selection
      setSelectedAds(new Set([index]));
      setHasSelection(true);
      // Submit immediately for pick_one
      submitSelection(new Set([index]));
    } else {
      // Multiple selection - toggle selection
      const newSelection = new Set(selectedAds);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setSelectedAds(newSelection);
      setHasSelection(newSelection.size > 0);
    }
    
    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleContinue = async () => {
    if (isLoading || taskCompleted || selectedAds.size === 0) return;
    
    // Submit selection for pick_multiple
    await submitSelection(selectedAds);
  };

  const verifyTaskTrustLevel = async (taskId: string) => {
    try {
      const response = await fetch('/api/accounts/verify-task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Task verification result:', data);
        
        // Display trust level update message
        const isGreen = data.trustworthy;
        const trustChange = data.trust_level_updated;
        
        showToast({
          message: `Trust level updated to ${trustChange}`,
          severity: isGreen ? NotificationSeverity.SUCCESS : NotificationSeverity.ERROR,
          showIcon: true,
          duration: 5000, // Show for 5 seconds
        });

        // Immediately refresh user info in profile to show updated trust/earnings
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ['userInfo', user.id] });
        }
      } else {
        console.error('Task verification failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error verifying task:', error);
    }
  };

  const submitSelection = async (selection: Set<number>) => {
    if (!adData.task?.id || !token) return;
    
    // Start submission animation sequence
    setIsSubmitting(true);
    
    try {
        // Extract ad_ids from the selected ads' clickthrough links
        const adIds = Array.from(selection).map(index => {
          const ad = adData.ads?.[index];
          if (!ad || !ad.clickthrough_link) return null;
          
          try {
            // Extract the first term from the link extension
            const url = new URL(ad.clickthrough_link.startsWith('http') ? ad.clickthrough_link : `https://${ad.clickthrough_link}`);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            console.log('pathParts', pathParts);
            return {ad_id: pathParts.length > 0 ? pathParts[pathParts.length - 1] : null, selection_index: index};
          } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
          }
        }).filter(id => id !== null && id.ad_id !== null);

        const response = await fetch('/api/tasks/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: adData.task.id,
            result: adIds
          }),
        });

        if (response.ok) {
          console.log('Task submission successful');
          
          // Call task verification asynchronously
          verifyTaskTrustLevel(adData.task.id);
          
          // Pick a random ad from the selection
          const selectedArray = Array.from(selection);
          const randomIndex = selectedArray[Math.floor(Math.random() * selectedArray.length)];
          setRandomSelectedAd(randomIndex);
          
          // Start pulse animation from reward box
          setTimeout(() => {
            setShowPulse(true);
          }, 200);
          
          // Start collapse animation after 600ms
          setTimeout(() => {
            setIsCollapsing(true);
          }, 600);
          
          // Stop pulse animation after 1.5 seconds
          setTimeout(() => {
            setShowPulse(false);
          }, 1500);
          
          // After collapse animation, show chosen ad
          setTimeout(() => {
            setTaskCompleted(true);
            setPreviousState('complete');
            setShowChosenAd(true);
          }, 1800);
          
        } else {
          console.error('Task submission failed');
          setIsSubmitting(false);
        }
          } catch (error) {
        console.error('Error submitting task:', error);
      }
  };



  // If no ads available, return null
  if (!adData.ads || adData.ads.length === 0) {
    return null;
  }

  // If selection has been made and animation is complete, show only the selected ad(s) in full width
  if (hasSelection && showChosenAd) {
    return (
      <div className="relative">
        {/* AdTile and Completed Earn Button wrapper */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {/* Show only the selected ads */}
            <div className="space-y-2">
              {Array.from(selectedAds).map((index) => {
                const ad = adData.ads?.[index];
                if (!ad) return null; // Skip if ad is undefined
                return (
                  <div
                    key={index}
                    className="overflow-hidden transition-all duration-1000 ease-in"
                    style={{
                      maxHeight: showChosenAd ? `400px` : '0px'
                    }}
                  >
                    <AdTile
                      link={ad.clickthrough_link}
                      advertiser={ad.advertiser}
                      contextualized_ad={ad.contextualized_ad}
                      clickable={true}
                      display_thumbs={true}
                      isStreaming={isStreaming}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Completed Earn Button */}
          {adData.task?.price_usd && (
            <div className="flex-shrink-0">
              <button
                disabled={true}
                className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-fit whitespace-nowrap bg-green-100 dark:bg-green-800/30 border border-green-200 dark:border-green-600 px-3 py-2 opacity-50 cursor-not-allowed"
                style={{ borderRadius: '1rem' }}
              >
                +${parseFloat(adData.task.price_usd).toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If task was already completed, show the ad without dropdown
  if (previousState === 'complete') {
    return (
      <div className="relative">
        {/* AdTile and Completed Earn Button wrapper */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {/* Show only the selected ads */}
            <div className="space-y-2">
              {Array.from(selectedAds).map((index) => {
                const ad = adData.ads?.[index];
                if (!ad) return null; // Skip if ad is undefined
                return (
                  <AdTile
                    key={index}
                    link={ad.clickthrough_link}
                    advertiser={ad.advertiser}
                    contextualized_ad={ad.contextualized_ad}
                    clickable={true}
                    display_thumbs={true}
                    isStreaming={isStreaming}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Completed Earn Button */}
          {adData.task?.price_usd && (
            <div className="flex-shrink-0">
              <button
                disabled={true}
                className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-fit whitespace-nowrap bg-green-100 dark:bg-green-800/30 border border-green-200 dark:border-green-600 px-3 py-2 opacity-50 cursor-not-allowed"
                style={{ borderRadius: '1rem' }}
              >
                +${parseFloat(adData.task.price_usd).toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show the grid of ads with radio selectors
  if (previousState === 'unloaded') {
    return null;
  }

  return (
    <div className="space-y-4 overflow-x-visible">
      {/* Main content container that collapses */}
      <div className={cn(
        "overflow-y-clip overflow-x-visible transition-all duration-700 ease-in-out",
        isCollapsing ? "max-h-0" : "max-h-[1000px]"
      )}>
        {/* Wrapper with rounded corners and top border progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-t-4 border-r border-b border-l border-gray-200 dark:border-gray-700 p-2 relative">
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
          
          {/* Reward and Instructions */}
          <div className="flex items-center gap-3 mb-2 mt-1 overflow-x-visible">
          {adData.task?.price_usd && (
            <div className="relative">
              <span className={cn(
                "text-sm font-bold text-gray-700 dark:text-gray-300 min-w-fit whitespace-nowrap bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded px-2 py-1 transition-all duration-1000 relative z-10",
                showPulse && "animate-pulse scale-125 shadow-lg"
              )}>
                {showPulse ? `+$${parseFloat(adData.task.price_usd).toFixed(2)}` : `Earn $${parseFloat(adData.task.price_usd).toFixed(2)}`}
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

        {/* 2-column grid of ads */}
        <div className="grid grid-cols-2 gap-4">
        {adData.ads.map((ad, index) => (
          <div 
            key={index} 
            className={cn(
              'relative transition-all duration-500 ease-in-out rounded-lg border-2 flex flex-col',
              selectedAds.has(index)
                ? isSubmitting 
                  ? 'border-blue-700 dark:border-blue-300 shadow-lg'
                  : 'border-blue-500 dark:border-blue-400 shadow-lg'
                : isLoading 
                  ? 'border-gray-200 dark:border-gray-300'
                  : 'border-gray-300 dark:border-gray-500 hover:border-gray-400 dark:hover:border-gray-400',
              isAnimating && selectedAds.has(index) && 'animate-pulse',
              'cursor-pointer' // Show pointer cursor
            )}
            onClick={() => {
              if (isLoading || taskCompleted) return;
              handleAdSelect(index);
            }}
          >
            {/* Option label */}
            <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
              Option {index + 1}:
            </div>

            {/* Ad tile container with equal padding */}
            <div className="p-2 flex-1 flex">
              <AdTile
                link={ad.clickthrough_link}
                advertiser={ad.advertiser}
                contextualized_ad={ad.contextualized_ad}
                clickable={false}
                display_thumbs={false}
                isStreaming={isStreaming}
              />
            </div>
          </div>
        ))}
        </div>
        </div>
      </div>

      {/* Continue button - only for pick_multiple */}
      {selection_method === 'pick_multiple' && (
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={selectedAds.size === 0 || isLoading || taskCompleted}
            className={cn(
              'px-6 py-2 rounded-lg font-medium transition-colors',
              selectedAds.size === 0 || isLoading || taskCompleted
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            )}
          >
            {isLoading ? 'Loading...' : 'Submit Selection'}
          </button>
        </div>
      )}
    </div>
   );
});

export default InlinePreferenceTask;
