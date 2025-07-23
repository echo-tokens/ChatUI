import { useContext } from 'react';
import { TranslationKeys, useLocalize, ThemeContext } from '~/hooks';
import { TStartupConfig } from 'librechat-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { ThemeSelector } from '~/components';
import { Banner } from '../Banners';
import Footer from './Footer';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();
  const { theme } = useContext(ThemeContext);
  
  // Determine which logo to use based on theme
  const isThemeDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isThemeDark ? '/assets/logo_full_dark.png' : '/assets/logo_full_light.png';

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a className="font-semibold text-green-600 hover:underline" href="/forgot-password">
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-gray-900">
      <Banner />
      <DisplayError />
      <div className="absolute bottom-0 left-0 md:m-4">
        <ThemeSelector />
      </div>

      <div className={`flex flex-grow items-center justify-center px-4 ${pathname.includes('register') ? 'pt-16' : ''}`}>
        <div className="w-full max-w-md space-y-8">
          {/* Echo Logo Section - 1.75x larger, moved down on signup */}
          <BlinkAnimation active={isFetching}>
            <div className="flex justify-center">
              <div className="h-[157px] w-auto">
                <img
                  src={logoSrc}
                  className="h-full w-auto object-contain"
                  alt="echo - AI, democratized"
                />
              </div>
            </div>
          </BlinkAnimation>

          {/* Main Auth Card */}
          <div className="overflow-hidden bg-white px-6 py-8 dark:bg-gray-900 sm:rounded-lg sm:shadow-lg">
            {!hasStartupConfigError && !isFetching && (
              <h1
                className="mb-6 text-center text-3xl font-semibold text-black dark:text-white"
                style={{ userSelect: 'none' }}
              >
                {header}
              </h1>
            )}
            {children}
            {!pathname.includes('2fa') &&
              (pathname.includes('login') || pathname.includes('register')) && (
                <SocialLoginRender startupConfig={startupConfig} />
              )}
          </div>
        </div>
      </div>
      <Footer startupConfig={startupConfig} />
    </div>
  );
}

export default AuthLayout;
