import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { getProvider } from '@/API/providers';
import { resolveImageUrl } from '@/utils/imageUrl';
import { ToasterHandler } from '../../../common/ToasterHandler.tsx';
import type { IMarvelUnlimitedDownloadProgress } from '@/interfaces/IMarvelUnlimited';
import type { IDCInfiniteDownloadProgress } from '@/interfaces/IDCInfinite';
import type { IVizDownloadProgress } from '@/interfaces/IViz';
import ColorThief from 'colorthief/dist/color-thief.mjs';

export type BookOrSeries = DisplayBook | DisplaySeries;

export interface OpenExplorerState {
  open: boolean;
  explorer: DisplayBook[];
  provider: any;
  booksNumber: number;
  type: 'series' | 'books';
}

export interface ContentViewerProps {
  provider: number;
  TheBook: BookOrSeries;
  type: 'series' | 'volume';
  handleAddBreadcrumbs: any;
  handleChangeToDetails?: (
    open: boolean,
    book: BookOrSeries,
    provider: any
  ) => void;
  onDownloaderDetailPage?: (comic: any) => void;
  downloadProgress?:
    | IMarvelUnlimitedDownloadProgress
    | IDCInfiniteDownloadProgress
    | IVizDownloadProgress;
  preloadedBooks?: DisplayBook[];
  onVolumeDownload?: (book: DisplayBook) => void;
  onDelete?: () => void;
  onRefresh?: () => void | Promise<void>;
  onBack?: () => void;
}

function extractIssueNumber(name: string): string | null {
  const hashMatch = name.match(/#(\d+)/);
  if (hashMatch) return String(parseInt(hashMatch[1], 10));
  const stripped = name.replace(/\(\d{4}\)/g, '').trim();
  const allNums = stripped.match(/\d+/g);
  if (allNums && allNums.length > 0) {
    return String(parseInt(allNums[allNums.length - 1], 10));
  }
  return null;
}

export function useContentViewer({
  provider: rawProvider,
  TheBook,
  type,
  preloadedBooks,
  onRefresh,
  onDelete,
}: ContentViewerProps) {
  const provider: number = (() => {
    const p =
      typeof rawProvider === 'string' ? parseInt(rawProvider, 10) : rawProvider;
    return isNaN(p) ? 0 : p;
  })();

  const isSeries = (_b: BookOrSeries): _b is DisplaySeries => type === 'series';
  const isBook = (_b: BookOrSeries): _b is DisplayBook => type !== 'series';

  const { t } = useTranslation();

  const [rating, setRating] = useState<number | null>(TheBook.note);
  const [favorite, setFavorite] = useState<boolean>(TheBook.favorite);
  const [characters, setCharacters] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [openMoreInfo, setOpenMoreInfo] = useState(false);
  const [moreInfoContent, setMoreInfoContent] = useState<any>({});
  const [readStatSeries, setReadStatSeries] = useState('0 / 0 volumes read');
  const [openExplorer, setOpenExplorer] = useState<OpenExplorerState>({
    open: false,
    explorer: [],
    provider: null,
    booksNumber: 0,
    type: 'series',
  });
  const [openDatabaseEditorDialog, setOpenDatabaseEditorDialog] =
    useState(false);
  const [openRematchDialog, setOpenRematchDialog] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(true);

  const APINOTFOUND = /[a-zA-Z]/g.test(TheBook.id);
  const hasFile =
    type !== 'volume' ||
    (TheBook.path && TheBook.path !== '' && TheBook.path !== 'null');

  const handleOpenMoreInfo = (
    name: string,
    desc: string,
    image: string,
    href: string,
    type: 'avatar' | 'cover' = 'avatar'
  ) => {
    setMoreInfoContent({ name, desc, image, href, type });
    setOpenMoreInfo(true);
  };

  const closeMoreInfo = () => setOpenMoreInfo(false);

  const handleCloseDatabaseEditorDialog = () =>
    setOpenDatabaseEditorDialog(false);
  const handleCloseRematchDialog = () => setOpenRematchDialog(false);
  const handleOpenRematchDialog = () => setOpenRematchDialog(true);

  function loadView(
    FolderRes: string,
    _libraryPath: string,
    _date: any = '',
    _provider: number = providerEnum.MANUAL
  ) {
    FolderRes = FolderRes.replaceAll('\\', '/').replaceAll('//', '/');
    setOpenExplorer({
      open: false,
      explorer: [],
      provider,
      booksNumber: 0,
      type: 'books',
    });

    if (type === 'series' && TheBook.id) {
      TauriAPI.getBooksBySeries(TheBook.id)
        .then((allBooks) => {
          const readCount = allBooks.filter((b) => b.read).length;
          setReadStatSeries(`${readCount} / ${allBooks.length} volumes read`);
          setOpenExplorer({
            open: true,
            explorer: allBooks.sort((a, b) =>
              (a.title || '').localeCompare(b.title || '', undefined, {
                numeric: true,
                sensitivity: 'base',
              })
            ),
            provider,
            booksNumber: 0,
            type: 'books',
          });
        })
        .catch((err) =>
          console.warn('[loadView] Failed to get books by series:', err)
        );
      return;
    }

    TauriAPI.getBooksByPath(FolderRes)
      .then((allBooks) => {
        const readCount = allBooks.filter((b) => b.read).length;
        setReadStatSeries(`${readCount} / ${allBooks.length} volumes read`);
        setOpenExplorer({
          open: true,
          explorer: allBooks.sort((a, b) =>
            (a.title || '').localeCompare(b.title || '', undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          ),
          provider,
          booksNumber: 0,
          type: 'books',
        });
      })
      .catch((err) =>
        console.warn('[loadView] Failed to get books by path:', err)
      );
  }

  async function loadMetronSeriesView(seriesPath: string, seriesId: string) {
    setOpenExplorer({
      open: false,
      explorer: [],
      provider,
      booksNumber: 0,
      type: 'books',
    });

    const bookList = await TauriAPI.getBooksBySeries(seriesId);

    const mergedBooks = new Map<string, DisplayBook>();
    for (const book of bookList) {
      const issueNum = book.issue_number || '';
      const existing = mergedBooks.get(issueNum);
      const hasFile = book.path && book.path !== '' && book.path !== 'null';
      if (!existing) {
        mergedBooks.set(issueNum, book);
      } else {
        const existingHasFile =
          existing.path && existing.path !== '' && existing.path !== 'null';
        if (hasFile && !existingHasFile) mergedBooks.set(issueNum, book);
      }
    }

    const sortedBooks = Array.from(mergedBooks.values()).sort((a, b) => {
      return (
        parseFloat(a.issue_number || '0') - parseFloat(b.issue_number || '0')
      );
    });

    const updateReadStat = (books: DisplayBook[]) => {
      const withFile = books.filter((b) => b.path && b.path !== '');
      const readCount = withFile.filter((b) => b.read).length;
      setReadStatSeries(`${readCount} / ${withFile.length} volumes read`);
    };

    updateReadStat(sortedBooks);
    setOpenExplorer({
      open: true,
      explorer: sortedBooks,
      provider,
      booksNumber: 0,
      type: 'books',
    });

    if (!seriesPath || seriesPath === '' || seriesPath === 'null') return;

    const metronNumId = parseInt(
      (TheBook as DisplaySeries).external_id?.replace(/[^0-9]/g, '') || '0',
      10
    );
    if (isNaN(metronNumId) || metronNumId === 0) return;

    TauriAPI.getFilesAndFoldersList(seriesPath)
      .then(async (rawData) => {
        const files = (
          typeof rawData === 'string' ? JSON.parse(rawData) : rawData
        ) as Array<{ name: string; path: string; is_dir: boolean }>;
        let anyLinked = false;

        for (const fileItem of files) {
          const existingBooks = await TauriAPI.getBooksByPath(fileItem.path);
          if (existingBooks.length === 0) {
            const basename = fileItem.path
              .replace(/.*[/\\]/, '')
              .replace(/\.[^.]+$/, '');
            const issueNum = extractIssueNumber(basename);
            if (issueNum !== null) {
              const linked = await TauriAPI.metronLinkPlaceholderToPath(
                metronNumId,
                issueNum,
                fileItem.path
              );
              if (linked) anyLinked = true;
            }
          }
        }

        if (anyLinked) {
          const refreshedList = await TauriAPI.getBooksBySeries(seriesId);
          const mergedRefreshed = new Map<string, DisplayBook>();
          for (const book of refreshedList) {
            const issueNum = book.issue_number || '';
            const existing = mergedRefreshed.get(issueNum);
            const hasFile =
              book.path && book.path !== '' && book.path !== 'null';
            if (!existing) {
              mergedRefreshed.set(issueNum, book);
            } else {
              const existingHasFile =
                existing.path &&
                existing.path !== '' &&
                existing.path !== 'null';
              if (hasFile && !existingHasFile)
                mergedRefreshed.set(issueNum, book);
            }
          }
          const sortedRefreshed = Array.from(mergedRefreshed.values()).sort(
            (a, b) =>
              parseFloat(a.issue_number || '0') -
              parseFloat(b.issue_number || '0')
          );
          updateReadStat(sortedRefreshed);
          setOpenExplorer({
            open: true,
            explorer: sortedRefreshed,
            provider,
            booksNumber: 0,
            type: 'books',
          });
        }
      })
      .catch((err) =>
        console.warn('[loadMetronSeriesView] filesystem scan failed:', err)
      );
  }

  const theBookRef = useRef(TheBook);
  theBookRef.current = TheBook;

  const preloadedBooksKey = preloadedBooks?.map((b) => b.id).join(',') ?? '';

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const book = theBookRef.current;

    if (type === 'series') {
      const preloaded = preloadedBooks;
      if (preloaded && preloaded.length > 0) {
        const withFile = preloaded.filter(
          (b) => b.path && b.path !== '' && b.path !== 'null'
        );
        const readCount = withFile.filter((b) => b.read).length;
        setReadStatSeries(`${readCount} / ${withFile.length} volumes read`);
        setOpenExplorer({
          open: true,
          explorer: preloaded,
          provider,
          booksNumber: 0,
          type: 'books',
        });
      } else if (!book.path || book.path === '' || book.path === 'null') {
        if (book.id) {
          TauriAPI.getBooksBySeries(book.id)
            .then((books) => {
              if (books.length > 0) {
                const sorted = books.sort((a, b) =>
                  (a.title || '').localeCompare(b.title || '', undefined, {
                    numeric: true,
                    sensitivity: 'base',
                  })
                );
                const withFile = sorted.filter(
                  (b) => b.path && b.path !== '' && b.path !== 'null'
                );
                const readCount = withFile.filter((b) => b.read).length;
                setReadStatSeries(
                  `${readCount} / ${withFile.length} volumes read`
                );
                setOpenExplorer({
                  open: true,
                  explorer: sorted,
                  provider,
                  booksNumber: 0,
                  type: 'books',
                });
              }
            })
            .catch((err) =>
              console.warn('[useContentViewer] getBooksBySeries failed:', err)
            );
        }
      } else {
        let libraryPath = book.path.replaceAll('\\', '/');
        libraryPath = libraryPath.replace(/\/[^/]+$/, '').replaceAll('/', '\\');

        if (provider === providerEnum.Marvel) {
          loadView(
            book.path,
            libraryPath,
            isSeries(book) ? (book as DisplaySeries).start_date : '',
            provider
          );
        } else if (provider === providerEnum.Metron) {
          loadMetronSeriesView(book.path, book.id);
        } else if (
          provider === providerEnum.Anilist ||
          provider === providerEnum.MANUAL ||
          isNaN(provider) ||
          provider === providerEnum.OL ||
          provider === providerEnum.GBooks
        ) {
          loadView(book.path, libraryPath, '', provider);
        }
      }
    }

    const bgCover = isSeries(book)
      ? (book as DisplaySeries).bg_url
      : ((book.extra?.bg_cover as string) ?? null);
    const coverUrl = book.cover_url;
    let imgUrl = '';

    if (provider !== providerEnum.Marvel) {
      imgUrl =
        bgCover && bgCover !== 'null'
          ? bgCover
          : coverUrl && coverUrl !== 'null'
            ? coverUrl
            : '';
    } else {
      const bgParsed =
        typeof bgCover === 'object' && bgCover !== null
          ? (bgCover as any).path
          : bgCover;
      imgUrl =
        bgParsed && bgParsed !== 'null'
          ? bgParsed
          : coverUrl && coverUrl !== 'null'
            ? coverUrl
            : '';
    }

    if (imgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      img.onload = () => {
        const colorThief = new ColorThief();
        try {
          const color = colorThief.getColor(img);
          if (!color) return;
          const [r, g, b] = color;
          const darker = `rgb(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)})`;
          setTimeout(() => {
            const body = document.getElementsByTagName('body')[0];
            body.style.transition = 'background 0.5s ease-in-out 0.5s';
            body.style.background = `linear-gradient(to left top, rgb(${r}, ${g}, ${b}), ${darker}) no-repeat fixed`;
          }, 500);
        } catch (e) {
          console.error('ColorThief error:', e);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    TheBook.id,
    TheBook.path,
    TheBook.cover_url,
    provider,
    type,
    preloadedBooksKey,
  ]);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorite(TheBook.favorite);
    setRating(TheBook.note);

    const chars = isSeries(TheBook)
      ? (TheBook as DisplaySeries).characters
      : (TheBook as DisplayBook).characters;
    setCharacters(chars || []);

    const creators = isSeries(TheBook)
      ? (TheBook as DisplaySeries).staff
      : (TheBook as DisplayBook).creators;
    setStaff(creators || []);

    const extra = TheBook.extra as Record<string, any> | undefined;
    if (extra?.relations && Array.isArray(extra.relations)) {
      const normalized = extra.relations.map((rel: any) => {
        const name =
          rel.name ||
          rel.title?.english ||
          rel.title?.romaji ||
          rel.title?.native ||
          t('unknown');
        const image =
          rel.image || rel.coverImage?.large || rel.coverImage?.medium || '';
        const description =
          rel.description || rel.relationType || rel.relation_type || '';
        return { ...rel, name, image, description };
      });
      setRelations(
        [...normalized].sort((a: any, b: any) =>
          (a.name || '').localeCompare(b.name || '')
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TheBook]);

  const handlePlay = async () => {
    if (type === 'volume') {
      await TauriAPI.updateBookStatusOne('reading', TheBook.id);
      localStorage.setItem('currentBook', TheBook.path);
      window.location.href = '/viewer';
    } else {
      try {
        const seriesBooks = await TauriAPI.getBooksBySeries(TheBook.id);
        const nextBook = seriesBooks.find((b) => b.unread || b.reading);
        if (nextBook) {
          localStorage.setItem('currentBook', nextBook.path);
          window.location.href = '/viewer';
        }
      } catch {
        // fallback
      }
    }
  };

  const handleFavoriteToggle = async () => {
    const itemType = type === 'volume' ? 'book' : 'series';
    try {
      const newValue = await TauriAPI.toggleFavorite(itemType, TheBook.id);
      setFavorite(newValue);
      ToasterHandler(newValue ? t('add_fav') : t('remove_fav'), 'success');
      if (onRefresh) await onRefresh();
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleStatusRead = async () => {
    try {
      if (type === 'volume') {
        await TauriAPI.updateBookStatusOne('read', TheBook.id);
      } else {
        await TauriAPI.updateBookStatusAll('read', TheBook.title);
      }
      ToasterHandler(t('mkread'), 'success');
      if (onRefresh) await onRefresh();
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleStatusReading = async () => {
    try {
      if (type === 'volume') {
        await TauriAPI.updateBookStatusOne('reading', TheBook.id);
      } else {
        await TauriAPI.updateBookStatusAll('reading', TheBook.title);
      }
      ToasterHandler(t('mkreading'), 'success');
      if (onRefresh) await onRefresh();
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleStatusUnread = async () => {
    try {
      if (type === 'volume') {
        await TauriAPI.updateBookStatusOne('unread', TheBook.id);
      } else {
        await TauriAPI.updateBookStatusAll('unread', TheBook.title);
      }
      ToasterHandler(t('mkunread'), 'success');
      if (onRefresh) await onRefresh();
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleRefreshMeta = async () => {
    const providerImpl = getProvider(provider);
    try {
      if (type === 'volume') {
        if (!providerImpl?.canRefreshBookMeta) {
          ToasterHandler(t('providerCannotRematch'), 'error');
        } else if (!TheBook.lock) {
          await TauriAPI.refreshMetadataByProvider(
            TheBook.id,
            provider,
            'book'
          );
          ToasterHandler(t('refreshMetadata') + ' ' + t('success'), 'success');
          if (onRefresh) await onRefresh();
        } else {
          ToasterHandler(t('bookLocked'), 'error');
        }
      } else {
        if (!providerImpl?.canRefreshSeriesMeta) {
          ToasterHandler(t('providerCannotRematch'), 'error');
        } else if (!TheBook.lock) {
          await TauriAPI.refreshMetadataByProvider(
            TheBook.id,
            provider,
            'series'
          );
          ToasterHandler(t('refreshMetadata') + ' ' + t('success'), 'success');
          if (onRefresh) await onRefresh();
        } else {
          ToasterHandler(t('seriesLocked'), 'error');
        }
      }
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const { t: _t } = { t };
    if (!confirm(t('confirmDeleteManual'))) return;
    try {
      if (type === 'volume') {
        await TauriAPI.deleteBook(TheBook.id);
      } else {
        await TauriAPI.deleteSeries(TheBook.id);
      }
      ToasterHandler(t('deleteSuccess'), 'success');
      onDelete();
    } catch (err) {
      ToasterHandler(String(err), 'error');
    }
  };

  const handleRatingChange = (star: number) => {
    const newValue = star === rating ? null : star;
    setRating(newValue);
    if (newValue === null) return;
    TauriAPI.updateRating(
      type === 'volume' ? 'book' : 'series',
      TheBook.id,
      newValue
    );
  };

  const getTitle = (name: string): string => {
    try {
      const parsed = JSON.parse(name);
      const parts: string[] = [];
      if (parsed.english) parts.push(parsed.english);
      if (parsed.native) parts.push(parsed.native);
      if (parsed.romanji) parts.push(parsed.romanji);
      if (parts.length > 0) return parts.join(' — ');
    } catch {
      return name;
    }
    return t('untitled');
  };

  const getCoverUrl = (): string => {
    if (!TheBook.cover_url || TheBook.cover_url === 'null')
      return 'Images/fileDefault.png';
    let raw = TheBook.cover_url.replaceAll('"', '');
    if (raw.includes('FirstImagesOfAll')) {
      const parts = raw.split(',');
      raw =
        parts.find(
          (p) => p.trim().length > 0 && !p.includes('FirstImagesOfAll')
        ) ??
        parts[0] ??
        raw;
    }
    return resolveImageUrl(raw) ?? 'Images/fileDefault.png';
  };

  const getExternalUrl = (): string | null => {
    const providerImpl = getProvider(provider);
    if (!providerImpl) return null;
    return providerImpl.getExternalUrl(
      TheBook,
      type === 'series' ? 'series' : 'volume'
    );
  };

  const isValid = (val: any): boolean =>
    val != null &&
    val !== 'null' &&
    val !== 'NULL' &&
    val !== '' &&
    val !== undefined;

  const getCharactersCount = (): number => {
    if (characters.length > 0) return characters.length;
    const chars = isSeries(TheBook)
      ? (TheBook as DisplaySeries).characters
      : (TheBook as DisplayBook).characters;
    return chars?.length ?? 0;
  };

  const getCreatorsCount = (): number => {
    if (staff.length > 0) return staff.length;
    const creators = isSeries(TheBook)
      ? (TheBook as DisplaySeries).staff
      : (TheBook as DisplayBook).creators;
    return creators?.length ?? 0;
  };

  const hasValidPrices = (): boolean => {
    const prices = (TheBook.extra as Record<string, any>)?.prices;
    return (
      prices != null &&
      prices !== 'null' &&
      prices !== '' &&
      provider === providerEnum.Marvel
    );
  };

  const getProviderLabel = (): string => {
    const providerImpl = getProvider(provider);
    if (!providerImpl) return t('notFromAPI');
    const attr = providerImpl.attribution;
    return attr.startsWith('providedBy')
      ? t('providedBy') + ' ' + attr.replace('providedBy ', '')
      : t(attr);
  };

  const getReadingProgress = (): number => {
    if (isBook(TheBook)) {
      return (TheBook as DisplayBook).reading_progress?.percentage ?? 0;
    }
    return 0;
  };

  const getSeriesName = (): string => {
    const book = TheBook as DisplayBook;
    const extra = book.extra as Record<string, any> | undefined;
    if (provider === providerEnum.Marvel) {
      const series = extra?.series;
      return series
        ? ((typeof series === 'string'
            ? tryToParse(series)?.name
            : series?.name) ?? t('unknown'))
        : t('unknown');
    }
    if (provider === providerEnum.Anilist) {
      const series = extra?.series;
      return series
        ? String(series).split('_')[2]?.replaceAll('$', ' ')
        : t('unknown');
    }
    return extra?.series_name || book.series_id || t('unknown');
  };

  const getDateDisplay = (tFn: (k: string) => string): React.ReactNode => {
    if (type === 'volume') {
      const extra = TheBook.extra as Record<string, any> | undefined;
      const dates = extra?.dates;
      if (provider === providerEnum.Marvel) {
        const parsedDates =
          typeof dates === 'string' ? tryToParse(dates) : dates;
        if (
          parsedDates &&
          Array.isArray(parsedDates) &&
          parsedDates.length > 0
        ) {
          return (
            tFn('releaseDates') +
            ': ' +
            new Date(parsedDates[0]['date']).toLocaleDateString()
          );
        }
        return '?';
      }
      const parsedDates = typeof dates === 'string' ? tryToParse(dates) : dates;
      if (parsedDates && Array.isArray(parsedDates) && parsedDates.length > 0) {
        return parsedDates
          .map(
            (date: { type: string; date: string }) =>
              `${date.type.replace(/([A-Z])/g, ' $1').trim()}: ${date.date}`
          )
          .join(', ');
      }
      return '?';
    }
    const series = TheBook as DisplaySeries;
    let startYear: string | number = '?';
    let endYear: string | number = '?';
    if (!APINOTFOUND) {
      const startParsed = tryToParse(series.start_date);
      const endParsed = tryToParse(series.end_date);
      startYear =
        provider === providerEnum.Marvel
          ? (startParsed ?? '?')
          : (startParsed?.year ?? startParsed ?? '?');
      endYear =
        provider === providerEnum.Marvel
          ? endParsed == null || endParsed > new Date().getFullYear()
            ? '?'
            : endParsed
          : (endParsed?.year ?? endParsed) == null ||
              (endParsed?.year ?? endParsed) > new Date().getFullYear()
            ? '?'
            : (endParsed?.year ?? endParsed);
    } else {
      const startParsed = tryToParse(series.start_date);
      const endParsed = tryToParse(series.end_date);
      startYear = startParsed ?? '?';
      endYear =
        endParsed == null || endParsed > new Date().getFullYear()
          ? '?'
          : endParsed;
    }
    return `${startYear} — ${endYear}`;
  };

  const getStatusBadgeInfo = (): {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: string;
    text: string;
  } | null => {
    if (type === 'volume') {
      const book = TheBook as DisplayBook;
      if (book.read) return { variant: 'default', icon: 'Check', text: 'READ' };
      if (book.unread)
        return { variant: 'destructive', icon: 'X', text: 'UNREAD' };
      if (book.reading)
        return { variant: 'secondary', icon: 'BookOpen', text: 'READING' };
      return null;
    }
    const series = TheBook as DisplaySeries;
    if (series.status === 'FINISHED')
      return { variant: 'default', icon: 'Check', text: 'FINISHED' };
    if (series.status === 'RELEASING')
      return { variant: 'secondary', icon: 'BookOpen', text: 'RELEASING' };
    if (series.status === 'NOT_YET_RELEASED')
      return { variant: 'destructive', icon: 'X', text: 'NOT_YET_RELEASED' };
    if (provider === providerEnum.Marvel) {
      const endDate = tryToParse((series as DisplaySeries).end_date);
      const startDate = tryToParse((series as DisplaySeries).start_date);
      if (endDate > new Date().getFullYear())
        return { variant: 'secondary', icon: 'BookOpen', text: 'RELEASING' };
      if (endDate < new Date().getFullYear())
        return { variant: 'default', icon: 'Check', text: 'FINISHED' };
      if (startDate > new Date().getFullYear())
        return { variant: 'destructive', icon: 'X', text: 'NOT_YET_RELEASED' };
      if (startDate === new Date().getFullYear())
        return { variant: 'secondary', icon: 'BookOpen', text: 'ENDSOON' };
    }
    return { variant: 'destructive', icon: 'HelpCircle', text: 'UNKNOWN' };
  };

  return {
    provider,
    rating,
    setRating,
    favorite,
    characters,
    staff,
    relations,
    openMoreInfo,
    moreInfoContent,
    readStatSeries,
    openExplorer,
    openDatabaseEditorDialog,
    openRematchDialog,
    showPlaceholders,
    setShowPlaceholders,
    APINOTFOUND,
    hasFile,
    handleOpenMoreInfo,
    closeMoreInfo,
    handleCloseDatabaseEditorDialog,
    setOpenDatabaseEditorDialog,
    handleCloseRematchDialog,
    handleOpenRematchDialog,
    handlePlay,
    handleFavoriteToggle,
    handleStatusRead,
    handleStatusReading,
    handleStatusUnread,
    handleRefreshMeta,
    handleDelete,
    handleRatingChange,
    getTitle,
    getCoverUrl,
    getExternalUrl,
    isValid,
    getCharactersCount,
    getCreatorsCount,
    hasValidPrices,
    getProviderLabel,
    getReadingProgress,
    getSeriesName,
    getDateDisplay,
    getStatusBadgeInfo,
    isSeries,
    isBook,
    t,
  };
}
