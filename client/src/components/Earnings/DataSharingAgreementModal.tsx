import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import type { ContextType } from '~/common';
import { cn } from '~/utils';
import { Button } from '~/components/ui';

interface DataSharingAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => Promise<void>;
  user?: any;
  error?: string | null;
}

export default function DataSharingAgreementModal({
  isOpen,
  onClose,
  onAgree,
  user,
  error
}: DataSharingAgreementModalProps) {
  const { navVisible } = useOutletContext<ContextType>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAgree = async () => {
    if (!hasAccepted) {
      setValidationError('Please check the box to indicate you have read and agree to the terms.');
      return;
    }

    setValidationError(null);
    try {
      setIsProcessing(true);
      await onAgree();
      onClose();
    } catch (error) {
      console.error('Error accepting data sharing agreement:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setHasAccepted(false);
      setValidationError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Calculate the left offset based on navbar visibility
  // Navbar width is 260px on desktop, 320px on mobile
  const navbarWidth = typeof window !== 'undefined' && window.innerWidth <= 768 ? 320 : 260;
  const leftOffset = navVisible ? navbarWidth : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="flex min-h-full items-center justify-center p-4"
        style={{
          marginLeft: `${leftOffset}px`,
          width: `calc(100vw - ${leftOffset}px)`,
        }}
      >
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Data Sharing Agreement
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="w-full">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Echo Task Earning Program - Data Sharing Agreement
                </h3>
                
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    Welcome to the Echo Task Earning Program. By participating in this program, you agree to share certain data 
                    to help improve AI systems while earning compensation for your contributions.
                  </p>

                  <h4 className="font-semibold text-gray-900 dark:text-white">What Data We Collect</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Task responses and submissions you provide</li>
                    <li>Time spent on tasks and completion patterns</li>
                    <li>Quality ratings and feedback on your work</li>
                    <li>Basic demographic information (optional)</li>
                    <li>Usage patterns and interaction data with our platform</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 dark:text-white">How We Use Your Data</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Training and improving machine learning models</li>
                    <li>Research and development of AI systems</li>
                    <li>Quality assurance and task validation</li>
                    <li>Platform optimization and user experience improvement</li>
                    <li>Academic research in partnership with educational institutions</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 dark:text-white">Your Rights and Privacy</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Your data is anonymized before being used for training</li>
                    <li>You can withdraw from the program at any time</li>
                    <li>You have the right to request deletion of your data</li>
                    <li>We never sell your personal information to third parties</li>
                    <li>All data is stored securely with enterprise-grade encryption</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 dark:text-white">Compensation Terms</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>You will be paid for each successfully completed task</li>
                    <li>Payment rates vary based on task complexity and type</li>
                    <li>Earnings are processed weekly via your chosen payment method</li>
                    <li>Quality bonuses may be awarded for exceptional work</li>
                    <li>Minimum payout threshold is $10.00</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 dark:text-white">Data Retention</h4>
                  <p>
                    We retain your task data for up to 7 years to ensure model quality and for research purposes. 
                    Personal identifying information is deleted after 3 years or upon request, whichever comes first.
                  </p>

                  <h4 className="font-semibold text-gray-900 dark:text-white">Contact and Support</h4>
                  <p>
                    If you have questions about this agreement or wish to exercise your data rights, 
                    please contact our privacy team at privacy@echo.ai or through our support portal.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900 dark:text-blue-100">Benefits of Participation</h5>
                        <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">
                          By joining our program, you're not only earning money but also contributing to the advancement 
                          of AI technology that benefits everyone. Your contributions help create more accurate, fair, 
                          and useful AI systems.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(error || validationError) && (
              <div className="px-6 pb-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-200 text-sm">{error || validationError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAccepted}
                  onChange={(e) => setHasAccepted(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I have read and agree to the Data Sharing Agreement terms and conditions. 
                  I understand that my task data will be used to improve AI systems and that 
                  I will be compensated for my contributions.
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAgree}
                  disabled={!hasAccepted || isProcessing}
                  className={cn(
                    hasAccepted && !isProcessing
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  )}
                >
                  {isProcessing ? 'Processing...' : 'Accept and Start Earning'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}