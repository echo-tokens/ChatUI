import { useEffect } from 'react';

export function DynamicFavicon() {
  useEffect(() => {
    const setFavicon = () => {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.href = (window.matchMedia('(prefers-color-scheme: dark)').matches)
                      ? '/assets/favicon-white.svg'
                      : '/assets/favicon-black.svg';
      }
    };

    // Set initial favicon
    setFavicon();

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', setFavicon);

    return () => mediaQuery.removeEventListener('change', setFavicon);
  }, []);

  return null;
}
