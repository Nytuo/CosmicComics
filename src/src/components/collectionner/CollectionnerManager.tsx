// noinspection HtmlUnknownTarget

import * as React from 'react';
import { FileUp } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import HomeContainer from '@/components/collectionner/home/Home.tsx';
import * as TauriAPI from '@/API/TauriAPI';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import BooksDetails from './details/BooksDetails.tsx';
import SeriesDetails from './details/SeriesDetails.tsx';
import { ToasterHandlerPromise } from '../common/ToasterHandler.tsx';
import UploadDialog from './dialogs/UploadDialog.tsx';
import APISelectorDialog from './dialogs/APISelectorDialog.tsx';

import DownloadersWrapperPage from './downloaders/DownloadersWrapperPage.tsx';
import AboutDialog from './dialogs/AboutDialog.tsx';
import BookmarksDialog from './dialogs/BookmarksDialog.tsx';
import SettingsDialog from './dialogs/SettingsDialog.tsx';
import { AppSidebar } from './app-sidebar.tsx';
import LibrariesPage from './LibrariesPage.tsx';

type BookOrSeries = DisplayBook | DisplaySeries;

interface ISearchElement {
  title: string;
  path: string;
  provider: any;
  type: string;
  series?: string;
  rawTitle: string;
}

export default function MiniDrawer({
  CosmicComicsTemp,
}: {
  CosmicComicsTemp: string;
}) {
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [openBookmarks, setOpenBookmarks] = React.useState(false);
  const [openSettings, setOpenSettings] = React.useState(false);
  const [openAbout, setOpenAbout] = React.useState(false);
  const [showLibraries, setShowLibraries] = React.useState(false);
  const [downloadersOpen, setDownloadersOpen] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState<{
    open: boolean;
    book: BookOrSeries;
    provider: any;
  } | null>(null);
  const [openSeries, setOpenSeries] = React.useState<{
    open: boolean;
    series: DisplaySeries;
    provider: any;
  } | null>(null);
  const [openAPISelector, setOpenAPISelector] = React.useState(false);
  const [breadcrumbs, setBreadcrumbs] = React.useState<
    { text: string; onClick: () => void }[]
  >([
    {
      text: t('HOME'),
      onClick: () => {
        setOpenDetails(null);
        setOpenSeries(null);
        handleRemoveBreadcrumbsTo(1);
      },
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchOpen, _setSearchOpen] = React.useState(false);
  const [searchOptions, setSearchOptions] = React.useState<ISearchElement[]>(
    []
  );
  const [bookDiscoverProgress, _setBookDiscoverProgress] = React.useState({
    x: 0,
    of: 0,
    file: '',
  });
  const searchLoading = searchOpen && searchOptions.length === 0;

  const handleCloseUpload = () => {
    setUploadOpen(false);
  };
  const handleOpenUpload = () => {
    setUploadOpen(true);
  };

  const handleOpenDetails = (
    open: boolean,
    book: BookOrSeries,
    provider: any
  ) => {
    setShowLibraries(false);
    setDownloadersOpen(false);
    setOpenSeries(null);
    setOpenDetails({ open: open, book: book, provider: provider });
  };

  const handleOpenSeries = (
    open: boolean,
    series: BookOrSeries,
    provider: any
  ) => {
    setShowLibraries(false);
    setDownloadersOpen(false);
    setOpenDetails(null);
    setOpenSeries({
      open: open,
      series: series as DisplaySeries,
      provider: provider,
    });
  };

  const handleChangeToDetails = (
    _open: boolean,
    book: BookOrSeries,
    provider: any
  ) => {
    setOpenSeries(null);
    setOpenDetails({ open: true, book: book, provider: provider });
  };

  const handleChangeToSeries = (
    _open: boolean,
    series: BookOrSeries,
    provider: any
  ) => {
    setOpenDetails(null);
    setOpenSeries({
      open: true,
      series: series as DisplaySeries,
      provider: provider,
    });
    handleRemoveBreadcrumbsTo(1);
  };
  const handleAddBreadcrumbs = (text: string, onClick: () => void) => {
    setBreadcrumbs([...breadcrumbs, { text: text, onClick: onClick }]);
  };
  const handleRemoveBreadcrumbsTo = (index: number) => {
    setBreadcrumbs(breadcrumbs.slice(0, index));
  };

  const handleOpenDownloaders = () => {
    setOpenDetails(null);
    setOpenSeries(null);
    setShowLibraries(false);
    setDownloadersOpen(true);
  };

  React.useEffect(() => {
    if (!searchLoading) {
      return undefined;
    }

    if (searchOptions.length === 0) {
      (async () => {
        try {
          const allOptions: ISearchElement[] = [];
          const books = await TauriAPI.getAllBooks();
          for (const book of books) {
            allOptions.push({
              title: book.title,
              path: book.path,
              provider: book.provider_id,
              type: 'book',
              series: book.series_id ?? '',
              rawTitle: book.title,
            });
          }
          const series = await TauriAPI.getAllSeries();
          for (const s of series) {
            allOptions.push({
              title: s.title,
              path: s.path,
              provider: s.provider_id,
              type: 'series',
              series: s.title,
              rawTitle: s.title,
            });
          }
          setSearchOptions(allOptions);
        } catch {
          // ignore
        }
      })();
    }
  }, [searchLoading]);

  React.useEffect(() => {
    if (!searchOpen) {
      setSearchOptions([]);
    }
  }, [searchOpen]);

  const sidebarActions = [
    { label: t('open_file'), icon: FileUp, action: () => handleOpenUpload() },
  ];

  function setOpenHome() {
    setOpenDetails(null);
    setOpenSeries(null);
    setShowLibraries(false);
    setDownloadersOpen(false);
    setIsLoading(false);
    handleRemoveBreadcrumbsTo(1);
  }

  function setOpenLibraries() {
    setOpenDetails(null);
    setOpenSeries(null);
    setShowLibraries(true);
    setDownloadersOpen(false);
    setIsLoading(false);
  }

  return (
    <>
      <UploadDialog openModal={uploadOpen} onClose={handleCloseUpload} />
      <AboutDialog openModal={openAbout} onClose={() => setOpenAbout(false)} />
      <BookmarksDialog
        openModal={openBookmarks}
        onClose={() => setOpenBookmarks(false)}
      />
      <SettingsDialog
        openModal={openSettings}
        onClose={() => setOpenSettings(false)}
      />
      <APISelectorDialog
        openModal={openAPISelector}
        onClose={() => {
          setOpenAPISelector(false);
        }}
      />

      <SidebarProvider>
        <AppSidebar
          className="sticky top-0 h-svh overflow-y-auto"
          sidebarActions={sidebarActions}
          onOpenBookmarks={() => setOpenBookmarks(true)}
          onOpenSettings={() => setOpenSettings(true)}
          onOpenDownloaders={() => handleOpenDownloaders()}
          onOpenAbout={() => setOpenAbout(true)}
          onOpenHome={() => setOpenHome()}
          onOpenLibraries={() => setOpenLibraries()}
          onExtractMissingImages={() => {
            const promise = TauriAPI.fillBlankImages();
            ToasterHandlerPromise(
              promise,
              t('extracting_cover'),
              t('cover_extraction_completed'),
              t('error')
            );
          }}
        />

        <SidebarInset>
          <div className="p-2"></div>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {isLoading && bookDiscoverProgress.of !== 0 ? (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/90">
                <div className="text-center mx-[10%] w-full max-w-xl">
                  <Progress
                    value={
                      (bookDiscoverProgress.x * 100) / bookDiscoverProgress.of
                    }
                  />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('overlaymsg_discover_file')} {bookDiscoverProgress.file}{' '}
                    ({bookDiscoverProgress.x} / {bookDiscoverProgress.of})
                  </p>
                </div>
              </div>
            ) : isLoading && bookDiscoverProgress.of === 0 ? (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/90">
                <div className="text-center">
                  <Spinner className="size-8" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('overlaymsg_takecare')}
                  </p>
                </div>
              </div>
            ) : null}

            {openSeries && openSeries.open ? (
              <SeriesDetails
                stateSeries={openSeries}
                handleAddBreadcrumbs={handleAddBreadcrumbs}
                handleChangeToDetails={handleChangeToDetails}
                handleChangeToSeries={handleChangeToSeries}
                onDelete={() => setOpenHome()}
                onBack={() => {
                  if (breadcrumbs.length > 1) {
                    const previousBreadcrumb =
                      breadcrumbs[breadcrumbs.length - 2];
                    previousBreadcrumb.onClick();
                  } else {
                    setOpenHome();
                  }
                }}
              />
            ) : openDetails && openDetails.open ? (
              <BooksDetails
                stateDetails={openDetails}
                handleAddBreadcrumbs={handleAddBreadcrumbs}
                onDelete={() => setOpenHome()}
                onBack={() => {
                  if (breadcrumbs.length > 1) {
                    const previousBreadcrumb =
                      breadcrumbs[breadcrumbs.length - 2];
                    previousBreadcrumb.onClick();
                  } else {
                    setOpenHome();
                  }
                }}
              />
            ) : showLibraries ? (
              <LibrariesPage />
            ) : downloadersOpen ? (
              <DownloadersWrapperPage CosmicComicsTemp={CosmicComicsTemp} />
            ) : (
              <HomeContainer
                handleOpenDetails={handleOpenDetails}
                handleOpenSeries={handleOpenSeries}
                onOpenAPISelector={() => setOpenAPISelector(true)}
                CosmicComicsTemp={CosmicComicsTemp}
                refreshKey={0}
              />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
