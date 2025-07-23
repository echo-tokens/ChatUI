import { useContext } from 'react';
import { ThemeContext } from '~/hooks';
import EchoInfoModal from './EchoInfoModal';

export default function EchoLogoButton() {
  const { theme } = useContext(ThemeContext);
  
  // Determine which logo to use based on theme
  const isThemeDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isThemeDark ? '/assets/logo_full_dark.png' : '/assets/logo_full_light.png';

  return (
    <EchoInfoModal>
      <button
        className="my-1 flex h-10 items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
        aria-label="Echo Information"
      >
        <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
          <img
            src={logoSrc}
            alt="echo"
            className="h-6 w-auto object-contain"
          />
        </div>
      </button>
    </EchoInfoModal>
  );
} 