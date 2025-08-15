import React, { useState } from 'react';
import { ExternalLink, Shield, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';

interface StripeSetupFlowProps {
  onSetupComplete: () => void;
  onClose?: () => void;
  className?: string;
}

type SetupStep = 'intro' | 'requirements' | 'connecting' | 'verification' | 'complete';

export default function StripeSetupFlow({ 
  onSetupComplete, 
  onClose,
  className 
}: StripeSetupFlowProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [isConnecting, setIsConnecting] = useState(false);

  const requirements = [
    {
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      title: 'Valid Government ID',
      description: 'Driver\'s license, passport, or state ID for identity verification',
    },
    {
      icon: <CreditCard className="h-5 w-5 text-green-500" />,
      title: 'Bank Account',
      description: 'US checking or savings account for direct deposits',
    },
    {
      icon: <ExternalLink className="h-5 w-5 text-purple-500" />,
      title: 'Basic Information',
      description: 'Name, address, date of birth, and SSN for tax purposes',
    },
  ];

  const handleStartSetup = () => {
    setCurrentStep('requirements');
  };

  const handleProceedToStripe = async () => {
    setCurrentStep('connecting');
    setIsConnecting(true);
    
    try {
      // Simulate API call to create Stripe Connect account link
      // In real implementation, this would call your backend endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // This would normally open Stripe Connect in a new window/redirect
      // For demo purposes, we'll simulate the flow
      window.open('https://connect.stripe.com/setup/c/acct_example', '_blank', 'width=800,height=600');
      
      setCurrentStep('verification');
    } catch (error) {
      console.error('Failed to start Stripe setup:', error);
      setIsConnecting(false);
    }
  };

  const handleVerificationComplete = () => {
    setCurrentStep('complete');
    // In real implementation, you'd verify the account status with your backend
    setTimeout(() => {
      onSetupComplete();
    }, 2000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Set Up Payouts
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Enable secure payouts to start receiving your Echo earnings. We use Stripe to ensure safe and reliable money transfers.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Bank-level security</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your financial data is encrypted and never stored on our servers
              </p>
            </div>
            <Button onClick={handleStartSetup} className="w-full">
              Get Started
            </Button>
          </div>
        );

      case 'requirements':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                What You'll Need
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Have these items ready to complete setup quickly
              </p>
            </div>
            
            <div className="space-y-4">
              {requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {req.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {req.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {req.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                    Why we need this information
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    US financial regulations require identity verification for money transfers. This protects both you and our platform from fraud.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setCurrentStep('intro')} 
                variant="outline" 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleProceedToStripe} 
                className="flex-1"
                disabled={isConnecting}
              >
                Continue to Stripe
              </Button>
            </div>
          </div>
        );

      case 'connecting':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <div className="animate-spin">
                <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connecting to Stripe
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please complete the setup process in the Stripe window that just opened.
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Don't see the Stripe window? Check if it was blocked by your browser's popup blocker.
              </p>
            </div>
            <Button onClick={handleVerificationComplete} variant="outline">
              I've completed the Stripe setup
            </Button>
          </div>
        );

      case 'verification':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Verification in Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Stripe is verifying your information. This usually takes a few minutes but can take up to 24 hours.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Account created</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">Identity verification pending</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Bank account verification pending</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You'll receive an email confirmation once verification is complete. You can start earning immediately, but payouts will be available once verification finishes.
              </p>
            </div>
            <Button onClick={handleVerificationComplete}>
              Continue
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Setup Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your payout method has been successfully configured. You can now receive earnings from your Echo activities.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="text-left space-y-1">
                  <li>• Your earnings will accumulate as you engage with ads</li>
                  <li>• Funds are held for 45 days for advertiser refund protection</li>
                  <li>• You can cash out confirmed earnings anytime</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('max-w-md mx-auto', className)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {renderStep()}
        
        {onClose && currentStep === 'intro' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={onClose} variant="outline" className="w-full">
              Maybe Later
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 