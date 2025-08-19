import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './Dialog';
import { Button } from './Button';
import { TextareaAutosize } from './TextareaAutosize';
import { X, Upload } from 'lucide-react';
import { cn } from '~/utils';
import type { TMessage } from 'librechat-data-provider';

interface FloatingHelpButtonProps {
  className?: string;
  conversationId?: string;
  messages?: TMessage[];
}

const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ className, conversationId, messages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      setIsSubmitting(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('text', description.trim());
        
        // Add conversation ID if available
        if (conversationId) {
          formData.append('chat_id', conversationId);
        }

        // Add messages state if available
        if (messages && messages.length > 0) {
          formData.append('state', JSON.stringify(messages));
        }
        
        // Add files to form data
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch('/api/help/submit', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Help request submitted successfully:', result);
          setIsOpen(false);
          setDescription('');
          setSelectedFiles([]);
        } else {
          const errorData = await response.json();
          console.error('Failed to submit help request:', errorData);
          setError(errorData.error || 'Failed to submit help request');
        }
      } catch (error) {
        console.error('Error submitting help request:', error);
        setError('Network error. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-transparent text-text-primary transition-all ease-in-out hover:bg-surface-tertiary disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        aria-label="Help"
        title="Click for help and tips"
      >
        <svg
          className="icon-md text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-8xl max-h-[80vh] overflow-y-auto sm:max-w-8xl w-[95vw] sm:w-[45vw] px-8 pt-6 pb-4" showCloseButton={false}>
          <DialogHeader className="flex flex-row justify-between items-center p-0 pb-4">
            <DialogTitle className="text-xl font-semibold text-text-primary">
              Help Request
            </DialogTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-5 w-5 text-text-primary" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-2">
            <div className="space-y-2">
              <label className="text-base font-medium text-text-primary">
                What issues are you having?
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                File Upload (Optional)
              </label>
              <div
                onClick={isSubmitting ? undefined : handleClick}
                onDragOver={isSubmitting ? undefined : handleDragOver}
                onDragLeave={isSubmitting ? undefined : handleDragLeave}
                onDrop={isSubmitting ? undefined : handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg transition-colors",
                  isSubmitting ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  isDragOver 
                    ? "border-gray-400 bg-gray-100 dark:bg-gray-700" 
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
                  selectedFiles.length > 0 && "border-green-500 dark:border-green-400"
                )}
              >
                <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                {selectedFiles.length > 0 ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-text-secondary">Click to change files</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">Drop files here or click to browse</p>
                    <p className="text-xs text-text-secondary">Supports multiple files</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Description
              </label>
              <TextareaAutosize
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue you're experiencing..."
                className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-text-primary"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-border-light">
              <Button
                type="submit"
                variant="outline"
                disabled={!description.trim() || isSubmitting}
                className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600 hover:text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingHelpButton;
