import { useContext } from 'react';
import { TooltipAnchor, Button } from '~/components/ui';
import { ThemeContext } from '~/hooks';
import EchoInfoModal from './EchoInfoModal';

export default function LogoButton() {
  const { theme } = useContext(ThemeContext);
  
  // Determine which logo to use based on theme
  const isThemeDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isThemeDark ? '/assets/logo_full_dark.png' : '/assets/logo_full_light.png';

  return (
    <EchoInfoModal>
      <TooltipAnchor
        description="echo"
        render={
          <Button
            size="icon"
            variant="outline"
            data-testid="logo-button"
            aria-label="echo"
            className="rounded-xl border border-border-light bg-surface-secondary p-2 hover:bg-surface-hover max-md:hidden h-10"
          >
            <img
              src={logoSrc}
              alt="echo"
              className="h-6 w-auto object-contain"
              style={{ maxWidth: 'none' }}
            />
          </Button>
        }
      />
    </EchoInfoModal>
  );
} 