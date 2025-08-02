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
function PinnableText({ text, pins, onPinToggle, adDescriptions, onAdDescriptionChange, isSubmitting }: PinnableTextProps) {
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

    // Function to render markdown with integrated pin slots and ads
    const renderMarkdownWithPins = () => {
        const lines = text.split('\n');
        const result: Array<{ type: 'line' | 'pinSlot' | 'ad'; content?: string; index: number }> = [];
        let pinIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            result.push({ type: 'line', content: line, index: i });
            
            // Add a pin slot or ad after each line (including the last line)
            if (pins.includes(pinIndex)) {
                result.push({ type: 'ad', index: pinIndex });
            } else {
                result.push({ type: 'pinSlot', index: pinIndex });
            }
            pinIndex++;
            
            // Check if we need to skip consecutive empty lines
            if (i < lines.length - 1) {
                // Look ahead to see if there are consecutive empty lines
                let j = i + 1;
                let hasEmptyLines = false;
                
                // Skip over consecutive empty lines
                while (j < lines.length && lines[j].trim() === '') {
                    hasEmptyLines = true;
                    j++;
                }
                
                // If we found empty lines, skip them in the main loop
                if (hasEmptyLines) {
                    i = j - 1; // -1 because the for loop will increment
                }
            }
        }
        
        return result;
    };

    return (
        <div className="integrated-markdown">
            {renderMarkdownWithPins().map((element, elementIndex) => (
                <div key={elementIndex}>
                    {element.type === 'line' ? (
                        <div className="markdown-line">
                            <Markdown
                                components={{
                                    p: ({ children, ...props }) => <p className="markdown-p" {...props}>{children}</p>,
                                    strong: ({ children, ...props }) => <strong className="markdown-strong" {...props}>{children}</strong>,
                                    em: ({ children, ...props }) => <em className="markdown-em" {...props}>{children}</em>,
                                    code: ({ children, ...props }) => <code className="markdown-code" {...props}>{children}</code>,
                                    pre: ({ children, ...props }) => <pre className="markdown-pre" {...props}>{children}</pre>,
                                    blockquote: ({ children, ...props }) => <blockquote className="markdown-blockquote" {...props}>{children}</blockquote>,
                                    h1: ({ children, ...props }) => <h1 className="markdown-h1" {...props}>{children}</h1>,
                                    h2: ({ children, ...props }) => <h2 className="markdown-h2" {...props}>{children}</h2>,
                                    h3: ({ children, ...props }) => <h3 className="markdown-h3" {...props}>{children}</h3>,
                                    ul: ({ children, ...props }) => <ul className="markdown-ul" {...props}>{children}</ul>,
                                    ol: ({ children, ...props }) => <ol className="markdown-ol" {...props}>{children}</ol>,
                                    li: ({ children, ...props }) => <li className="markdown-li" {...props}>{children}</li>,
                                }}
                            >
                                {element.content || '\u00A0'}
                            </Markdown>
                        </div>
                    ) : element.type === 'pinSlot' ? (
                        <div className="inline-pin-slot">
                            <button
                                className="pin-button"
                                onClick={() => !isSubmitting && onPinToggle(element.index)}
                                disabled={isSubmitting}
                                title="Add pin"
                            >
                                +
                            </button>
                        </div>
                    ) : (
                        <div className="inline-ad-placeholder">
                            <div className="ad-header">
                                <span>📢 Advertisement</span>
                                <button
                                    className="remove-pin-button"
                                    onClick={() => !isSubmitting && onPinToggle(element.index)}
                                    disabled={isSubmitting}
                                    title="Remove pin"
                                >
                                    ×
                                </button>
                            </div>
                            <textarea
                                className="ad-description-input"
                                placeholder="Describe the advertisement content..."
                                value={adDescriptions[element.index] || ''}
                                onChange={(e) => !isSubmitting && onAdDescriptionChange(element.index, e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}
                </div>
            ))}
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
            throw new Error('Please provide a description for every ad placement before submitting.');
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


            </div>
        </div>
    );
});

export default AdPlacementAndDescriptionTaskView;