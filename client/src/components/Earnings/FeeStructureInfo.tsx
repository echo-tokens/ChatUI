import React from 'react';
import { Info, DollarSign, Clock, Zap, AlertCircle } from 'lucide-react';
import { cn } from '~/utils';

interface FeeStructureInfoProps {
  className?: string;
}

export default function FeeStructureInfo({ className }: FeeStructureInfoProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const payoutMethods = [
    {
      id: 'ach',
      name: 'Bank Transfer (ACH)',
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      fee: '$0.25 fixed',
      time: '1-3 business days',
      minimum: '$0.01',
      recommended: '$1.00+',
      description: 'Standard bank transfer to your checking or savings account',
      pros: ['Lowest fees', 'Reliable', 'No percentage fee'],
      cons: ['Slower processing', 'Business days only'],
    },
    {
      id: 'instant',
      name: 'Instant Payout',
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      fee: '$0.50 + 1.5%',
      time: 'Within 30 minutes',
      minimum: '$0.50',
      recommended: '$2.00+',
      description: 'Instant transfer to your debit card',
      pros: ['Instant processing', 'Available 24/7', 'Great for urgent needs'],
      cons: ['Higher fees', 'Percentage-based cost', 'Debit card required'],
    },
  ];

  const revenueShareInfo = [
    { level: 1, name: 'New User', share: 70, color: 'bg-gray-500' },
    { level: 2, name: 'Active', share: 75, color: 'bg-blue-500' },
    { level: 3, name: 'Trusted', share: 85, color: 'bg-green-500' },
    { level: 4, name: 'Elite', share: 90, color: 'bg-purple-500' },
    { level: 5, name: 'Partner', share: 95, color: 'bg-orange-500' },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Revenue Share Structure */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue Share Structure
          </h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your earnings are based on your trust level. Higher trust levels unlock better revenue shares and benefits.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {revenueShareInfo.map((level) => (
            <div
              key={level.level}
              className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className={cn('w-8 h-8 rounded-full mx-auto mb-2', level.color)} />
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Level {level.level}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {level.name}
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {level.share}%
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it works:</strong> When you engage with an ad that converts, you earn a percentage of the advertiser's payment. 
            The 30% pool split formula ensures sustainable platform operations while maximizing user rewards.
          </p>
        </div>
      </div>

      {/* Payout Methods Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payout Methods
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {payoutMethods.map((method) => (
            <div
              key={method.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {method.icon}
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {method.name}
                </h3>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {method.description}
              </p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Fee:</span>
                  <span className="font-medium">{method.fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Processing time:</span>
                  <span className="font-medium">{method.time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Minimum:</span>
                  <span className="font-medium">{method.minimum}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Recommended:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {method.recommended}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    ✓ Pros
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                    {method.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                    ⚠ Considerations
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                    {method.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Important Information
          </h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              45-Day Hold Period
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              All earnings are held for 45 days to allow for advertiser refunds and chargebacks. 
              This protects both you and our platform from fraud while ensuring legitimate earnings are secure.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Tax Considerations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Earnings over $600 per year will require tax reporting. We'll provide 1099 forms as needed. 
              Consider consulting a tax professional for advice on your specific situation.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Trust Level Progression
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your trust level increases based on consistent, quality engagement patterns, total earnings, 
              and account verification status. Higher levels unlock better revenue shares and payout terms.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Security & Privacy
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              All financial data is processed through Stripe Connect with bank-level encryption. 
              We never store your banking information directly on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 