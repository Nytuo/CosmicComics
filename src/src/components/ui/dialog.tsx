import * as React from 'react';
import { XIcon } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMobileLayout } from '@/hooks/use-mobile-layout';

/**
 * Dialogs are centred modals on desktop and bottom drawers on phones. The
 * choice is made once at the root and shared through context so every part
 * (`DialogContent`, `DialogTitle`, …) keeps the same API in both modes.
 */
const DrawerModeContext = React.createContext(false);

function Dialog({
  adaptive = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  adaptive?: boolean;
}) {
  const mobile = useMobileLayout() && adaptive;
  return (
    <DrawerModeContext.Provider value={mobile}>
      {mobile ? (
        <DrawerPrimitive.Root
          data-slot="dialog"
          direction="bottom"
          {...props}
        />
      ) : (
        <DialogPrimitive.Root data-slot="dialog" {...props} />
      )}
    </DrawerModeContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const drawer = React.useContext(DrawerModeContext);
  const Trigger = drawer ? DrawerPrimitive.Trigger : DialogPrimitive.Trigger;
  return <Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const drawer = React.useContext(DrawerModeContext);
  const Close = drawer ? DrawerPrimitive.Close : DialogPrimitive.Close;
  return <Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  fullScreen = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  fullScreen?: boolean;
}) {
  const drawer = React.useContext(DrawerModeContext);

  if (drawer) {
    return (
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
        />
        <DrawerPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            'bg-background fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border-t border-border shadow-2xl outline-none',
            fullScreen && 'h-[92dvh]',
            className,
            'w-full! max-w-none! sm:w-full! sm:max-w-none! sm:h-auto! max-h-[92dvh]!'
          )}
          {...props}
        >
          <div className="bg-muted-foreground/30 mx-auto mt-3 mb-1 h-1.5 w-11 shrink-0 rounded-full" />
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    );
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid grid-cols-1 translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none overflow-y-auto',
          fullScreen
            ? 'w-[95vw] h-[90dvh]'
            : 'w-[calc(100vw-1.5rem)] sm:w-auto max-w-[95vw] max-h-[90dvh]',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  const drawer = React.useContext(DrawerModeContext);
  const Close = drawer ? DrawerPrimitive.Close : DialogPrimitive.Close;
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <Close asChild>
          <Button variant="outline">Close</Button>
        </Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const drawer = React.useContext(DrawerModeContext);
  const Title = drawer ? DrawerPrimitive.Title : DialogPrimitive.Title;
  return (
    <Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const drawer = React.useContext(DrawerModeContext);
  const Description = drawer
    ? DrawerPrimitive.Description
    : DialogPrimitive.Description;
  return (
    <Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
