import { useContext, useState } from 'react';
import { ThemeContext } from '~/hooks';
import { 
  OGDialog, 
  OGDialogTrigger, 
  OGDialogContent, 
  OGDialogHeader, 
  OGDialogTitle,
  OGDialogFooter,
  Button 
} from '~/components/ui';

interface EchoInfoModalProps {
  children: React.ReactNode;
}

export default function EchoInfoModal({ children }: EchoInfoModalProps) {
  const { theme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  
  // Determine which logo to use based on theme
  const isThemeDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isThemeDark ? '/assets/logo_full_dark.png' : '/assets/logo_full_light.png';

  const handleSetupPayouts = () => {
    // Navigate to earnings dashboard
    window.location.href = '/earnings';
    setOpen(false);
  };

  return (
    <OGDialog open={open} onOpenChange={setOpen}>
      <OGDialogTrigger asChild>
        {children}
      </OGDialogTrigger>
      <OGDialogContent className="max-w-[min(42rem,calc(100%-2rem))] bg-surface-dialog text-text-primary mx-auto">
        <OGDialogHeader className="text-center">
          {/* Echo Logo */}
          <div className="my-2 flex justify-center">
            <img
              src={logoSrc}
              alt="echo"
              className="h-12 w-auto object-contain"
            />
          </div>
          {/* <OGDialogTitle className="text-xl font-semibold pt-2 text-center">
            AI, democratized
          </OGDialogTitle> */}
        </OGDialogHeader>
        
        {/* Main Content */}
        <div className="space-y-6 px-6 py-2">
          <div className="space-y-4">
            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <div className="mt-2.5 h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Yesterday's internet ran on keyword roulette and cookie crumbs; the AI era can hear authentic intent.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-2.5 h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Echo channels that intelligence to swap blanket ads for precise introductions—only the products and services that truly advance your goal.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-2.5 h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Advertisers reward that relevance, letting us keep world-class chat perpetually free and share the value back to you.
                </p>
              </li>
            </ul>
          </div>
          
          {/* Payout Section */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Average Monthly Payout
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  $65
                </p>
              </div>
              
              <Button
                onClick={handleSetupPayouts}
                variant="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-medium"
              >
                Go to Earnings
              </Button>
            </div>
          </div>
        </div>
        
        {/* <OGDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="px-4 py-2"
          >
            Close
          </Button>
        </OGDialogFooter> */}
      </OGDialogContent>
    </OGDialog>
  );
} 