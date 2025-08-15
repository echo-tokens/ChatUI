import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Constants } from 'librechat-data-provider';
import { ThemeContext } from '~/hooks';
import { useChatContext } from '~/Providers';
import EchoInfoModal from './EchoInfoModal';

export default function EchoLogoButton() {
  const { theme } = useContext(ThemeContext);
  const { conversationId } = useParams();
  const { conversation } = useChatContext();
  
  // Determine which logo to use based on theme
  const isThemeDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isThemeDark ? '/assets/logo_full_dark.png' : '/assets/logo_full_light.png';

  // Only show on landing page (no conversation or new conversation with no messages)
  const isLandingPage = 
    (!conversation?.messages || conversation.messages.length === 0) &&
    (conversationId === Constants.NEW_CONVO || !conversationId);

  if (!isLandingPage) {
    return null;
  }

  return (
    <EchoInfoModal>
      <button
        className="flex items-center justify-center hover:opacity-80 transition-opacity"
        aria-label="Echo Information"
      >
        <img
          src={logoSrc}
          alt="echo"
          className="h-24 w-auto object-contain"
        />
      </button>
    </EchoInfoModal>
  );
} 