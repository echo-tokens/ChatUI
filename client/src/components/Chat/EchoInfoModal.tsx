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
import { DollarSign } from 'lucide-react';

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
      <OGDialogContent className="max-w-2xl bg-surface-dialog text-text-primary">
        <OGDialogHeader className="text-center">
          {/* Echo Logo */}
          <div className="mb-4 flex justify-center">
            <img
              src={logoSrc}
              alt="echo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <OGDialogTitle className="text-xl font-semibold">
            AI, democratized
          </OGDialogTitle>
        </OGDialogHeader>
        
        {/* Main Content */}
        <div className="px-6 py-4">
          <div className="space-y-4 text-center">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Yesterday's internet ran on keyword roulette and cookie crumbs; the AI era can hear authentic intent. 
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Echo channels that intelligence to swap blanket ads for precise introductions—only the products and services that truly advance your goal. 
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Advertisers reward that relevance, letting us keep world-class chat perpetually free and share the value back to you.
            </p>
          </div>
          
          {/* Payout Section */}
          <div className="flex items-center justify-center gap-6 rounded-lg bg-surface-secondary p-6">
            {/* Average Monthly Payout Display */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-2xl font-bold text-green-600 dark:text-green-400">
                <DollarSign className="h-6 w-6" />
                <span>65</span>
              </div>
              <p className="text-sm text-text-secondary">
                Average Monthly Payout
              </p>
            </div>
            
            {/* Set Up Payouts Button */}
            <Button
              onClick={handleSetupPayouts}
              variant="submit"
              className="bg-green-600 px-6 py-2 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
            >
              Set Up Payouts
            </Button>
          </div>
        </div>
        
        <OGDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="px-4 py-2"
          >
            Close
          </Button>
        </OGDialogFooter>
      </OGDialogContent>
    </OGDialog>
  );
} 