import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Kbd } from '@/components/ui/kbd.tsx';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'shortcut_turn' },
  { keys: ['Space', 'PgDn'], label: 'shortcut_next' },
  { keys: ['PgUp'], label: 'shortcut_previous' },
  { keys: ['Home', 'End'], label: 'shortcut_first_last' },
  { keys: ['Ctrl', '←/→'], label: 'shortcut_rotate' },
  { keys: ['Shift', 'Wheel'], label: 'shortcut_zoom' },
  { keys: ['B'], label: 'shortcut_bookmark' },
  { keys: ['S'], label: 'shortcut_settings' },
  { keys: ['F'], label: 'shortcut_fullscreen' },
  { keys: ['Esc'], label: 'shortcut_escape' },
  { keys: ['?'], label: 'shortcut_help' },
];

export default function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shortcuts_title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('shortcuts_title')}
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map(({ keys, label }) => (
            <li
              key={label}
              className="flex items-center justify-between gap-4 py-2 text-sm"
            >
              <span>{t(label)}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
