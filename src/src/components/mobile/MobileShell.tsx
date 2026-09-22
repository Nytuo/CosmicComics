import * as React from 'react';
import {
  Bookmark,
  CloudDownload,
  FilePlus2,
  FileUp,
  ImageIcon,
  Info,
  LibraryBig,
  Lightbulb,
  RefreshCcw,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { usePlatform } from '@/hooks/use-platform.ts';
import MobileBottomNav, { type MobileSection } from './MobileBottomNav.tsx';
import MobileTopBar from './MobileTopBar.tsx';
import ActionSheet, { type SheetAction } from './ActionSheet.tsx';

export type { MobileSection };

interface MobileShellProps {
  section: MobileSection;
  title: string;
  onBack?: () => void;
  onNavigate: (section: Exclude<MobileSection, 'more'>) => void;
  onImport: () => void;
  onAddManual: () => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenDownloaders: () => void;
  onOpenAbout: () => void;
  onOpenSync: () => void;
  onOpenLibraries: () => void;
  onExtractMissingImages: () => void;
  children: React.ReactNode;
}

/**
 * Phone chrome around the collectionner: top app bar, floating bottom
 * navigation, and the "create" / "more" action sheets that replace the
 * desktop sidebar and its dropdown.
 */
export default function MobileShell({
  section,
  title,
  onBack,
  onNavigate,
  onImport,
  onAddManual,
  onOpenBookmarks,
  onOpenSettings,
  onOpenDownloaders,
  onOpenAbout,
  onOpenSync,
  onOpenLibraries,
  onExtractMissingImages,
  children,
}: MobileShellProps) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const createActions: SheetAction[] = [
    {
      id: 'import',
      label: t('open_file'),
      description: t('nav_import_hint'),
      icon: FileUp,
      tone: 'accent',
      onSelect: onImport,
    },
    {
      id: 'manual',
      label: t('add_a_new_manual_book'),
      icon: FilePlus2,
      onSelect: onAddManual,
    },
  ];

  const moreActions: SheetAction[] = [
    {
      id: 'sync',
      label: t('sync_title'),
      description: t('sync_hint'),
      icon: RefreshCcw,
      tone: 'accent',
      onSelect: onOpenSync,
    },
    {
      id: 'libraries',
      label: t('libraries'),
      description: t('nav_libraries_hint'),
      icon: LibraryBig,
      onSelect: onOpenLibraries,
    },
    {
      id: 'bookmarks',
      label: t('Bookmark'),
      icon: Bookmark,
      onSelect: onOpenBookmarks,
    },
    {
      id: 'downloaders',
      label: t('downloaders'),
      icon: CloudDownload,
      hidden: !platform.downloaders,
      onSelect: onOpenDownloaders,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
      onSelect: onOpenSettings,
    },
    {
      id: 'covers',
      label: t('ExtractMissingImg'),
      icon: ImageIcon,
      onSelect: onExtractMissingImages,
    },
    {
      id: 'wiki',
      label: t('wiki'),
      icon: Lightbulb,
      onSelect: () => {
        openUrl('https://github.com/Nytuo/CosmicComics/wiki');
      },
    },
    {
      id: 'about',
      label: t('about'),
      icon: Info,
      onSelect: onOpenAbout,
    },
  ];

  return (
    <div className="min-h-svh">
      <MobileTopBar title={title} onBack={onBack} />
      <main className="px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <MobileBottomNav
        section={section}
        onCreate={() => setCreateOpen(true)}
        onNavigate={(next) => {
          if (next === 'more') setMoreOpen(true);
          else onNavigate(next);
        }}
      />
      <ActionSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('nav_create')}
        actions={createActions}
      />
      <ActionSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title={t('tools')}
        actions={moreActions}
      />
    </div>
  );
}
