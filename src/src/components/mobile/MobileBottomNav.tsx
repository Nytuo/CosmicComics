import * as React from 'react';
import {
  BarChart3,
  Home,
  LibraryBig,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type MobileSection = 'home' | 'libraries' | 'stats' | 'more';

interface MobileBottomNavProps {
  section: MobileSection;
  onNavigate: (section: MobileSection) => void;
  onCreate: () => void;
}

/** Floating glass tab bar with a raised "add" action in the middle. */
export default function MobileBottomNav({
  section,
  onNavigate,
  onCreate,
}: MobileBottomNavProps) {
  const { t } = useTranslation();

  const items: {
    id: MobileSection;
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: 'home', label: t('HOME'), icon: Home },
    { id: 'libraries', label: t('nav_library'), icon: LibraryBig },
    { id: 'stats', label: t('nav_stats'), icon: BarChart3 },
    { id: 'more', label: t('nav_more'), icon: MoreHorizontal },
  ];

  const renderItem = ({ id, label, icon: Icon }: (typeof items)[number]) => {
    const active = section === id;
    return (
      <button
        key={id}
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => onNavigate(id)}
        className="group flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 outline-none"
      >
        <span
          className={cn(
            'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 group-active:scale-90',
            active
              ? 'bg-secondary text-secondary-foreground shadow-md shadow-secondary/30'
              : 'text-muted-foreground'
          )}
        >
          <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span
          className={cn(
            'max-w-full truncate text-[11px] leading-none',
            active ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label={t('nav_main')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center rounded-[28px] border border-border/70 bg-card/85 px-1.5 py-0.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {items.slice(0, 2).map(renderItem)}
        <div className="flex w-16 shrink-0 justify-center">
          <button
            type="button"
            aria-label={t('nav_create')}
            onClick={onCreate}
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg shadow-secondary/40 ring-4 ring-background transition-transform active:scale-90"
          >
            <Plus className="size-7" strokeWidth={2.4} />
          </button>
        </div>
        {items.slice(2).map(renderItem)}
      </div>
    </nav>
  );
}
