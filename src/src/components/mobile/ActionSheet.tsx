import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export interface SheetAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  onSelect: () => void;
  tone?: 'default' | 'accent' | 'danger';
  hidden?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actions: SheetAction[];
}

/** Bottom drawer listing large, thumb-sized actions. */
export default function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
}: ActionSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="text-lg">{title}</DrawerTitle>
          {description ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : (
            <DrawerDescription className="sr-only">{title}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
          {actions
            .filter((action) => !action.hidden)
            .map(
              ({
                id,
                label,
                description: sub,
                icon: Icon,
                onSelect,
                tone = 'default',
              }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    // Let the drawer finish closing before the next surface opens.
                    window.setTimeout(onSelect, 150);
                  }}
                  className="flex items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors active:bg-accent"
                >
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                      tone === 'accent' &&
                        'bg-secondary text-secondary-foreground',
                      tone === 'danger' && 'bg-destructive/15 text-destructive',
                      tone === 'default' && 'bg-muted text-foreground'
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      {label}
                    </span>
                    {sub && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {sub}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )
            )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
