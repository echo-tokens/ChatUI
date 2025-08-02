import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import './AdPlacementAndDescriptionTaskView.css';

// Types for the pinnable text component
interface PinnableTextProps {
    text: string;
    pins: number[];
    onPinToggle: (index: number) => void;
    adDescriptions: { [key: number]: string };
    onAdDescriptionChange: (pinIndex: number, description: string) => void;
    isSubmitting: boolean;
}

// Custom component for pinnable text with markdown support
function PinnableText({ text, pins, onPinToggle, isSubmitting }: PinnableTextProps) {
    if (!text || text === 'Loading...' || text === 'pre-fetch') {
        return <Markdown>{text}</Markdown>;
    }

    // Split text by all newlines to get individual lines
    const rawLines = text.split('\n');
    
    // Process lines to consolidate consecutive empty lines
    const processedElements: Array<{ type: 'line' | 'pinSlot'; content?: string; index: number }> = [];
    let pinSlotIndex = 0;
    
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        processedElements.push({ type: 'line', content: line, index: i });
        
        // Add a pin slot after each line (including the last line)
        processedElements.push({ type: 'pinSlot', index: pinSlotIndex });
        pinSlotIndex++;
        
        // Check if we need to skip consecutive empty lines
        if (i < rawLines.length - 1) {
            // Look ahead to see if there are consecutive empty lines
            let j = i + 1;
            let hasEmptyLines = false;
            
            // Skip over consecutive empty lines
            while (j < rawLines.length && rawLines[j].trim() === '') {
                hasEmptyLines = true;
                j++;
            }
            
            // If we found empty lines, skip them in the main loop
            if (hasEmptyLines) {
                i = j - 1; // -1 because the for loop will increment
            }
        }
    }

    // Custom component for pin slot between lines
    const PinSlot = ({ index }: { index: number }) => {
        const isLinePinned = pins.includes(index);
        const isLastSlot = index === pinSlotIndex - 1;
        
        let slotLabel = `Insertion point ${index + 1}`;
        if (isLastSlot) {
            slotLabel = 'Insertion point after last line';
        }
        
        return (
            <div
                className={`pin-slot ${isLinePinned ? 'pinned' : ''} ${isSubmitting ? 'disabled' : ''}`}
                onClick={() => !isSubmitting && onPinToggle(index)}
                title={isSubmitting ? 'Please wait...' : slotLabel}
                style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
                {isLinePinned ? (
                    <span className="pin-icon">📌</span>
                ) : (
                    <span className="pin-placeholder">+</span>
                )}
            </div>
        );
    };

    // Function to render a single line in the pin window
    const renderTextLine = (line: string, lineIndex: number) => {
        return (
            <div key={`line-${lineIndex}`} className="text-line">
                {line || '\u00A0'} {/* Non-breaking space for empty lines */}
            </div>
        );
    };

    return (
        <div className="pinnable-container">
            {/* Left side - Clean markdown display */}
            <div className="markdown-panel">
                <div className="panel-header">
                    📖 Formatted Response
                </div>
                <div className="markdown-content">
                    <Markdown
                        components={{
                            p: ({ children }) => <p>{children}</p>,
                            strong: ({ children }) => <strong>{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                            code: ({ children }) => <code>{children}</code>,
                            pre: ({ children }) => <pre>{children}</pre>,
                            blockquote: ({ children }) => <blockquote>{children}</blockquote>,
                            h1: ({ children }) => <h1>{children}</h1>,
                            h2: ({ children }) => <h2>{children}</h2>,
                            h3: ({ children }) => <h3>{children}</h3>,
                            ul: ({ children }) => <ul>{children}</ul>,
                            ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
                            li: ({ children, ...props }) => <li {...props}>{children}</li>,
                        }}
                    >
                        {text}
                    </Markdown>
                </div>
            </div>

            {/* Right side - Pin insertion window */}
            <div className={`pin-panel ${isSubmitting ? 'disabled' : ''}`}>
                <div className="pin-panel-header">
                    📌 Pin Placement Mode
                    {pins.length > 0 && (
                        <span className="pin-counter">
                            ({pins.length} pin{pins.length !== 1 ? 's' : ''} placed)
                        </span>
                    )}
                    <span className="pin-instructions">
                        {isSubmitting ? 'Please wait...' : 'Click the + symbols to mark insertion points after each line'}
                    </span>
                </div>
                
                <div className="pin-content">
                    {processedElements.map((element, elementIndex) => (
                        <div key={elementIndex}>
                            {element.type === 'line' ? (
                                renderTextLine(element.content!, element.index)
                            ) : (
                                <PinSlot index={element.index} />
                            )}
                        </div>
                    ))}
                </div>
                
                {pins.length > 0 && (
                    <div className="pin-status">
                        <strong>Active Pins:</strong> {pins.sort((a, b) => a - b).map(pin => `Position ${pin + 1}`).join(', ')}
                        <button 
                            className="clear-button"
                            onClick={() => {
                                if (!isSubmitting) {
                                    pins.forEach(pin => onPinToggle(pin)); // Remove all pins
                                }
                            }}
                            disabled={isSubmitting}
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const AdPlacementAndDescriptionTaskView = React.forwardRef<{ setAndCheckTaskResponse: () => Promise<void> }, { task: any, onSubmit: () => void, isSubmitting: boolean, taskResponse: any, setTaskResponse: (response: any) => void }>(({ task, onSubmit, isSubmitting, taskResponse, setTaskResponse }, ref) => {
    const [localPrompt, setLocalPrompt] = useState<string>(task.data.user_query);
    const [localResponse, setLocalResponse] = useState<string>(task.data.response);
    const [localInsertionList, setLocalInsertionList] = useState<number[]>([]);
    const [adDescriptions, setAdDescriptions] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        if (task && task.data && task.data.user_query && task.data.response) {
            // Read in the task and reset state
            setLocalPrompt(task.data.user_query);
            setLocalResponse(task.data.response);
            setLocalInsertionList([]);
            setAdDescriptions({});
        }
    }, [task]);



    const handlePinToggle = (wordIndex: number) => {
        if (isSubmitting) return; // Prevent pin toggling while submitting
        
        setLocalInsertionList(prev => {
            if (prev.includes(wordIndex)) {
                // Remove pin if it already exists
                const newList = prev.filter(index => index !== wordIndex);
                // Also remove the ad description for this pin
                setAdDescriptions(prevDescriptions => {
                    const newDescriptions = { ...prevDescriptions };
                    delete newDescriptions[wordIndex];
                    return newDescriptions;
                });
                return newList;
            } else {
                // Add pin if it doesn't exist
                return [...prev, wordIndex].sort((a, b) => a - b);
            }
        });
    };

    const handleAdDescriptionChange = (pinIndex: number, description: string) => {
        if (isSubmitting) return; // Prevent changes while submitting
        
        setAdDescriptions(prev => ({
            ...prev,
            [pinIndex]: description
        }));
    };

    const setAndCheckTaskResponse = async () => {
        // Set the task response with current state
        setTaskResponse({
            pin_list: localInsertionList,
            ad_descriptions: adDescriptions
        });

        // Check if any ad descriptions are empty
        const hasEmptyAdDescription = localInsertionList.some(
            (pinIndex) => !adDescriptions[pinIndex] || adDescriptions[pinIndex].trim() === ''
        );
        if (localInsertionList.length > 0 && hasEmptyAdDescription) {
            throw new Error('Please provide a description for every pin before submitting.');
        }
        
        // Call the onSubmit callback
        onSubmit();
    }

    useEffect(() => {
        if (ref) {
            (ref as any).current = { setAndCheckTaskResponse };
        }
    }, [ref, setAndCheckTaskResponse]);

    return (
        <div className="task-container">
            <div className="task-content">
                <h3 className="section-title">User Query</h3>
                <div className="prompt-content">
                    <Markdown>{localPrompt}</Markdown>
                </div>
                
                <h3 className="section-title-response">
                    Response
                </h3>
                <div className="response-container">
                    <PinnableText 
                        text={localResponse} 
                        pins={localInsertionList} 
                        onPinToggle={handlePinToggle} 
                        adDescriptions={adDescriptions}
                        onAdDescriptionChange={handleAdDescriptionChange}
                        isSubmitting={isSubmitting}
                    />
                </div>

                {/* Ad Description Section */}
                {localInsertionList.length > 0 && (
                    <div className={`ad-descriptions-section ${isSubmitting ? 'disabled' : ''}`}>
                        <h3 className="ad-descriptions-title">
                            📝 Ad Descriptions ({localInsertionList.length} pin{localInsertionList.length !== 1 ? 's' : ''})
                        </h3>
                        <p className="ad-descriptions-subtitle">
                            {isSubmitting ? 'Please wait while processing...' : 'Describe what type of advertisement would be appropriate for each pin:'}
                        </p>
                        
                        <div className="ad-descriptions-grid">
                            {localInsertionList.sort((a, b) => a - b).map((pinIndex) => (
                                <div key={pinIndex} className="ad-description-item">
                                    <label className="ad-description-label">
                                        Position {pinIndex + 1}:
                                    </label>
                                    <textarea
                                        className="ad-description-textarea"
                                        value={adDescriptions[pinIndex] || ''}
                                        onChange={(e) => handleAdDescriptionChange(pinIndex, e.target.value)}
                                        placeholder="Describe what type of ad would be appropriate here (e.g., 'Kitchen equipment ad for woks or stir-fry pans')"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default AdPlacementAndDescriptionTaskView;