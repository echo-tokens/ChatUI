import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';


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
        <div className="flex flex-col gap-0">
            {renderMarkdownWithPins().map((element, elementIndex) => (
                <div key={elementIndex} className="relative">
                    {element.type === 'line' ? (
                        <div className="flex-1">
                            <Markdown
                                components={{
                                    p: ({ children, ...props }) => <p className="my-0 leading-6 text-[var(--text-primary)]" {...props}>{children}</p>,
                                    strong: ({ children, ...props }) => <strong className="font-bold text-[var(--text-primary)]" {...props}>{children}</strong>,
                                    em: ({ children, ...props }) => <em className="italic text-[var(--text-primary)]" {...props}>{children}</em>,
                                    code: ({ children, ...props }) => <code className="bg-[var(--surface-tertiary)] dark:bg-[var(--surface-tertiary)] px-1 py-0.5 rounded text-sm font-mono text-[var(--text-primary)]" {...props}>{children}</code>,
                                    pre: ({ children, ...props }) => <pre className="bg-[var(--surface-tertiary)] dark:bg-[var(--surface-tertiary)] p-3 rounded overflow-auto my-0 text-sm font-mono leading-6 text-[var(--text-primary)]" {...props}>{children}</pre>,
                                    blockquote: ({ children, ...props }) => <blockquote className="border-l-4 border-[var(--border-medium)] pl-4 my-0 italic text-[var(--text-secondary)]" {...props}>{children}</blockquote>,
                                    h1: ({ children, ...props }) => <h1 className="text-2xl font-bold my-0 mb-0 text-[var(--text-primary)]" {...props}>{children}</h1>,
                                    h2: ({ children, ...props }) => <h2 className="text-xl font-bold my-0 mb-0 text-[var(--text-primary)]" {...props}>{children}</h2>,
                                    h3: ({ children, ...props }) => <h3 className="text-lg font-bold my-0 mb-0 text-[var(--text-primary)]" {...props}>{children}</h3>,
                                    ul: ({ children, ...props }) => <ul className="list-disc pl-5 my-0 text-[var(--text-primary)]" {...props}>{children}</ul>,
                                    ol: ({ children, ...props }) => <ol className="list-decimal pl-5 my-0 text-[var(--text-primary)]" {...props}>{children}</ol>,
                                    li: ({ children, ...props }) => <li className="list-item my-0 leading-6 text-[var(--text-primary)]" {...props}>{children}</li>,
                                    hr: ({ ...props }) => <hr className="my-4 border-[var(--border-medium)]" {...props} />,
                                }}
                            >
                                {element.content || '\u00A0'}
                            </Markdown>
                        </div>
                    ) : element.type === 'pinSlot' ? (
                        <div className="absolute flex justify-start items-center p-0 -ml-10" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                            <button
                                className="p-1 border border-[var(--border-medium)] dark:border-[var(--border-heavy)] bg-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)] rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center relative group"
                                onClick={() => !isSubmitting && onPinToggle(element.index)}
                                disabled={isSubmitting}
                                // title="Insert Ad Here"
                                                            >
                                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
                                        <path d="M3 2L9 6L3 10" stroke="var(--border-medium)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-[var(--border-heavy)]"/>
                                    </svg>
                                    {/* Custom tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                        Insert Ad Here
                                        {/* Tooltip arrow */}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800 dark:border-t-gray-900"></div>
                                    </div>
                            </button>
                        </div>
                    ) : (
                        <div className="my-2 p-3 pr-4 bg-[var(--surface-tertiary)] border border-[var(--border-medium)] rounded-lg border-l-4 border-l-green-500 relative min-h-20 block">
                            <div className="flex justify-between items-center italic text-[var(--text-secondary)] text-sm font-normal mb-2">
                                <span>📢 Advertisement</span>
                                <button
                                    className="bg-none border-none text-[var(--text-secondary)] text-lg cursor-pointer p-0 w-5 h-5 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--surface-hover)] hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed min-w-5 min-h-5"
                                    onClick={() => !isSubmitting && onPinToggle(element.index)}
                                    disabled={isSubmitting}
                                    title="Remove pin"
                                                                >
                                ×
                                </button>
                            </div>
                            <textarea
                                className="w-full min-h-15 p-2 mt-2 text-sm border border-[var(--border-medium)] rounded bg-[var(--surface-primary)] text-[var(--text-primary)] resize-y font-inherit transition-colors duration-200 focus:outline-none focus:border-green-500 focus:shadow-sm disabled:bg-[var(--surface-tertiary)] disabled:text-[var(--text-secondary)] disabled:cursor-not-allowed block"
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
        // Create the response data
        const responseData = {
            pin_list: localInsertionList,
            ad_descriptions: adDescriptions
        };

        // Set the task response with current state
        setTaskResponse(responseData);

        // Check if any ad descriptions are empty
        const hasEmptyAdDescription = localInsertionList.some(
            (pinIndex) => !adDescriptions[pinIndex] || adDescriptions[pinIndex].trim() === ''
        );
        if (localInsertionList.length > 0 && hasEmptyAdDescription) {
            throw new Error('Please provide a description for every ad placement before submitting.');
        }
        
        // Return the response data so the parent can use it immediately
        return responseData;
    }

    useEffect(() => {
        if (ref) {
            (ref as any).current = { setAndCheckTaskResponse };
        }
    }, [ref, setAndCheckTaskResponse]);

    return (
        <div className="p-0 m-0">
            <div className="p-0">
                <h3 className="text-left font-bold mb-2.5 pl-0 text-[var(--text-primary)]">User Query</h3>
                <div className="text-left mb-5 pl-0 text-[var(--text-primary)]">
                    <Markdown>{localPrompt}</Markdown>
                </div>
                
                <h3 className="text-left font-bold mb-4 pl-0 text-[var(--text-primary)]">
                    Response
                </h3>
                <div className="text-left mb-5 ml-0 mr-0 rounded bg-white dark:bg-gray-800 pt-0 pb-4 pl-12 pr-4">
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