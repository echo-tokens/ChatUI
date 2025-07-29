import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import PayoutRailSelector from './PayoutRailSelector';
import type { PayoutRail, PayoutRequest } from '~/types/earnings';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSubmitPayout: (request: PayoutRequest) => Promise<void>;
  isProcessing?: boolean;
  className?: string;
}

export default function CashOutModal({
  isOpen,
  onClose,
  availableBalance,
  onSubmitPayout,
  isProcessing = false,
  className
}: CashOutModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedRail, setSelectedRail] = useState<PayoutRail['id']>('ach_standard');
  const [step, setStep] = useState<'amount' | 'method' | 'confirm' | 'success'>('amount');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedRail('ach_standard');
      setStep('amount');
      setErrors({});
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateFee = (rail: PayoutRail['id'], amount: number): number => {
    if (rail === 'ach_standard') {
      return 0.25;
    } else if (rail === 'instant_visa_mc') {
      return 0.50 + (amount * 0.015);
    }
    return 0;
  };

  const getMinimumAmount = (rail: PayoutRail['id']): number => {
    return rail === 'ach_standard' ? 0.01 : 0.50;
  };

  const validateAmount = (amountStr: string): boolean => {
    const numAmount = parseFloat(amountStr);
    const newErrors: Record<string, string> = {};

    if (!amountStr || isNaN(numAmount)) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than $0';
    } else if (numAmount > availableBalance) {
      newErrors.amount = `Amount cannot exceed available balance of ${formatCurrency(availableBalance)}`;
    } else if (numAmount < getMinimumAmount(selectedRail)) {
      newErrors.amount = `Minimum amount for this method is ${formatCurrency(getMinimumAmount(selectedRail))}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountSubmit = () => {
    if (validateAmount(amount)) {
      setStep('method');
    }
  };

  const handleMethodSubmit = () => {
    if (validateAmount(amount)) {
      setStep('confirm');
    }
  };

  const handleConfirmPayout = async () => {
    const numAmount = parseFloat(amount);
    const fee = calculateFee(selectedRail, numAmount);
    const netAmount = numAmount - fee;

    const payoutRequest: PayoutRequest = {
      amount: numAmount,
      rail: selectedRail,
      estimated_fee: fee,
      net_amount: netAmount,
    };

    try {
      await onSubmitPayout(payoutRequest);
      setStep('success');
    } catch (error) {
      setErrors({ submit: 'Failed to process payout. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Cash Out
          </h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Amount */}
          {step === 'amount' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to cash out
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn(
                      'w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2',
                      errors.amount 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
                      'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    )}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.amount}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between mb-1">
                    <span>Available balance:</span>
                    <span className="font-medium">{formatCurrency(availableBalance)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setAmount(availableBalance.toFixed(2))}
                  variant="outline"
                  className="flex-1"
                >
                  Max Amount
                </Button>
                <Button
                  onClick={handleAmountSubmit}
                  className="flex-1"
                  disabled={!amount || parseFloat(amount) <= 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Method Selection */}
          {step === 'method' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Cashing out {formatCurrency(parseFloat(amount))}
                </p>
              </div>

              <PayoutRailSelector
                selectedRail={selectedRail}
                onSelectRail={setSelectedRail}
                amount={parseFloat(amount)}
              />

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('amount')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleMethodSubmit}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Confirm Payout
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Please review your payout details
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Amount:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Method:</span>
                  <span className="font-medium">
                    {selectedRail === 'ach_standard' ? 'Bank Transfer' : 'Instant Payout'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Fee:</span>
                  <span className="font-medium">{formatCurrency(calculateFee(selectedRail, parseFloat(amount)))}</span>
                </div>
                <hr className="border-gray-300 dark:border-gray-600" />
                <div className="flex justify-between text-lg font-semibold">
                  <span>You will receive:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(parseFloat(amount) - calculateFee(selectedRail, parseFloat(amount)))}
                  </span>
                </div>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{errors.submit}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('method')}
                  variant="outline"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmPayout}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Payout'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Payout Initiated!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your payout of {formatCurrency(parseFloat(amount) - calculateFee(selectedRail, parseFloat(amount)))} has been submitted and will arrive in{' '}
                  {selectedRail === 'ach_standard' ? '1-3 business days' : 'within 30 minutes'}.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 