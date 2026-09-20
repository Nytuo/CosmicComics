import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileTopBarProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

/** Compact translucent app bar: logo (or back arrow on sub-pages) + page title. */
export default function MobileTopBar({
  title,
  onBack,
  actions,
}: MobileTopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4">
        {onBack ? (
          <button
            type="button"
            aria-label={t('back')}
            onClick={onBack}
            className="-ml-2 flex size-10 items-center justify-center rounded-full transition-colors active:bg-accent"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <img
            src="/Images/Logo.png"
            alt=""
            className="size-8 shrink-0 rotate linear infinite"
          />
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
        {actions}
      </div>
    </header>
  );
}
