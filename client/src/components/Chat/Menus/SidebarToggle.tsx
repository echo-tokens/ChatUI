import { TooltipAnchor, Button } from '~/components/ui';
import { Sidebar } from '~/components/svg';
import { useLocalize } from '~/hooks';

export default function SidebarToggle({
  setNavVisible,
}: {
  setNavVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const localize = useLocalize();
  
  const handleToggle = () => {
    setNavVisible((prev) => {
      localStorage.setItem('navVisible', JSON.stringify(!prev));
      return !prev;
    });
  };

  return (
    <TooltipAnchor
      description={localize('com_nav_close_sidebar')}
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="sidebar-toggle-button"
          aria-label={localize('com_nav_close_sidebar')}
          className="mt-text-sm flex size-10 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-border-light text-sm transition-colors duration-200 hover:bg-surface-hover"
          onClick={handleToggle}
        >
          <Sidebar className="icon-sm" />
        </Button>
      }
    />
  );
} 