import * as React from 'react';
import { BookOpen, Check, Heart, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { cn } from '@/lib/utils.ts';

/**
 * Read / reading / unread / favourite shortcuts for the open book. Shared by
 * the desktop settings dialog and the mobile settings sheet.
 */
export default function BookQuickActions({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const [book, setBook] = React.useState<DisplayBook | null>(null);

  React.useEffect(() => {
    const path = localStorage.getItem('currentBook') ?? '';
    TauriAPI.getBooksByPath(path)
      .then(([found]) => setBook(found ?? null))
      .catch(() => setBook(null));
  }, []);

  if (!book) return null;

  const setStatus = async (
    status: 'read' | 'reading' | 'unread',
    message: string
  ) => {
    await TauriAPI.updateBookStatusOne(status, book.id);
    setBook({
      ...book,
      read: status === 'read',
      reading: status === 'reading',
      unread: status === 'unread',
    });
    ToasterHandler(t(message), 'success');
  };

  const toggleFavorite = async () => {
    const favorite = await TauriAPI.toggleFavorite('book', book.id);
    setBook({ ...book, favorite });
    ToasterHandler(favorite ? t('add_fav') : t('remove_fav'), 'success');
  };

  const items = [
    {
      id: 'read',
      label: t('mkread'),
      icon: Check,
      active: book.read,
      onClick: () => setStatus('read', 'marked_as_read'),
    },
    {
      id: 'reading',
      label: t('mkreading'),
      icon: BookOpen,
      active: book.reading,
      onClick: () => setStatus('reading', 'marked_as_reading'),
    },
    {
      id: 'unread',
      label: t('mkunread'),
      icon: Circle,
      active: book.unread,
      onClick: () => setStatus('unread', 'marked_as_unread'),
    },
    {
      id: 'favorite',
      label: t('favorite'),
      icon: Heart,
      active: book.favorite,
      onClick: toggleFavorite,
    },
  ];

  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {items.map(({ id, label, icon: Icon, active, onClick }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] font-medium transition-all active:scale-95',
            active
              ? 'border-secondary/60 bg-secondary/15 text-foreground'
              : 'border-border bg-card/60 text-muted-foreground'
          )}
        >
          <Icon
            className={cn(
              'size-5',
              active && id === 'favorite' && 'fill-red-500 text-red-500',
              active && id !== 'favorite' && 'text-secondary'
            )}
          />
          <span className="max-w-full truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}
