import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Window } from '@tauri-apps/api/window';
import ColorThief from 'colorthief/dist/color-thief.mjs';

import * as TauriAPI from '@/API/TauriAPI';
import { PanelRect } from '@/API/TauriAPI';
import { modifyConfigJson } from '@/utils/Fetchers.ts';
import Logger from '@/logger.ts';
import { IUserSettings } from '@/interfaces/IUserSettings.ts';
import {
  ToasterHandler,
  ToasterHandlerPromise,
} from '../common/ToasterHandler.tsx';

import ViewerHeader from './ViewerHeader.tsx';
import ViewerSidebar from './ViewerSidebar.tsx';
import ViewerNavigationControls from './ViewerNavigationControls.tsx';
import ViewerLoadingOverlay from './ViewerLoadingOverlay.tsx';
import ViewerPanelDebugOverlay from './ViewerPanelDebugOverlay.tsx';
import ViewerImageDisplay from './ViewerImageDisplay.tsx';
import ReaderSettingsDialog from './dialogs/ReaderSettingsDialog.tsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts';
import { useSlideShow } from './hooks/useSlideShow.ts';

const appWindow = Window.getCurrent();

const preloadedImages: string[] = [];
let bookID = 'NaID_' + Math.random() * 100500;
let listofImg: any[] = [];
let sessionCacheBust = Date.now();

/**
 * Set to `true`  → eager start (show first page immediately, cache the rest sequentially in background).
 * Set to `false` → wait for ALL pages to be cached before showing anything.
 */
const LAZY_PRELOAD = false;

export default function PersistentDrawerLeft() {
  const [open, setOpen] = React.useState(false);
  const [imageOne, setImageOne] = React.useState<string | null>(null);
  const [imageTwo, setImageTwo] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [bookLoaded, setBookLoaded] = React.useState(false);
  const CosmicComicsTemp = localStorage.getItem('CosmicComicsTemp') ?? '';
  let CosmicComicsTempI = localStorage.getItem('CosmicComicsTempI') ?? '';
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [rotation, setRotation] = React.useState(0);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [baseHeight, setBaseHeight] = React.useState<number | string>(
    window.innerHeight - 100
  );
  const [baseWidth, setBaseWidth] = React.useState<number | string>('auto');
  const [actionbarON, setActionbarON] = React.useState(true);
  const [sidebarON] = React.useState(false);
  const [origins, setOrigins] = React.useState<any[][]>([[0, 0]]);
  const [originsKept, setOriginsKept] = React.useState<any[][]>([[0, 0]]);
  const [DoublePageMode, setDoublePageMode] = React.useState(false);
  const [innerWidth, setInnerWidth] = React.useState(window.innerWidth);
  const [webToonMode, setWebToonMode] = React.useState(false);
  const [smartPanelMode, setSmartPanelMode] = React.useState(false);
  const [showPanelDebugOverlay, setShowPanelDebugOverlay] = React.useState(false);
  const [panels, setPanels] = React.useState<PanelRect[]>([]);
  const [currentPanelIndex, setCurrentPanelIndex] = React.useState(-1);
  const [panelTransform, setPanelTransform] = React.useState<string>('');
  const [isPanelZoomed, setIsPanelZoomed] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [unzipStatus, setUnzipStatus] = React.useState({
    status: 'waiting',
    percentage: 0,
    current_file: '',
  });

  React.useLayoutEffect(() => {
    window.addEventListener('resize', () => {
      setInnerWidth(window.innerWidth);
    });
    return () => {
      window.removeEventListener('resize', () => {
        setInnerWidth(window.innerWidth);
      });
    };
  }, []);

  React.useLayoutEffect(() => {
    if (DoublePageMode) {
      const origins = [
        [
          innerWidth / 4 + innerWidth / 3.7,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
        [
          innerWidth / 5.8,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
      ];
      setOrigins(origins);
      setOriginsKept(origins);
    } else {
      setOrigins([
        [
          innerWidth / 3,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
        [
          innerWidth / 3,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
      ]);
      setOriginsKept([
        [
          innerWidth / 3,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
        [
          innerWidth / 3,
          document.getElementsByTagName('header')[0].offsetHeight + 10,
        ],
      ]);
    }
  }, [DoublePageMode, innerWidth]);

  React.useEffect(() => {
    if (!DoublePageMode) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      imageTwo && setImageTwo(null);
    }
  }, [DoublePageMode, imageTwo]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const { t } = useTranslation();
  let isADirectory: boolean = false;

  function getImageAssetUrl(filename: string): string {
    if (isADirectory) {
      const bookPath = localStorage.getItem('currentBook') ?? '';
      return (
        convertFileSrc(`${bookPath}/${filename}`) + `?v=${sessionCacheBust}`
      );
    } else {
      const basePath = localStorage.getItem('CosmicComicsTemp') ?? '';
      return (
        convertFileSrc(`${basePath}/current_book/${filename}`) +
        `?v=${sessionCacheBust}`
      );
    }
  }

  function loadSingleImage(listImages: any, index: number): void {
    if (preloadedImages[index]) return;
    preloadedImages[index] = getImageAssetUrl(listImages[index]);
    console.log(
      `[preload] [${index + 1}/${listImages.length}] ${listImages[index]} → asset URL`
    );
  }

  function startBackgroundPreload(listImages: any, startIndex: number): void {
    const total = listImages.length;
    if (total === 0) return;
    console.log(
      `[preload] background start from index ${startIndex}, total=${total}`
    );
    for (let offset = 0; offset < total; offset++) {
      const idx = (startIndex + offset) % total;
      loadSingleImage(listImages, idx);
    }
    console.log(
      `[preload] background DONE – all ${total} asset URLs registered`
    );
  }

  function preloadAllImages(listImages: any): void {
    const totalImages = listImages.length;
    console.log(
      `[preloadImage] START – ${totalImages} images via asset protocol`
    );
    for (let index = 0; index < totalImages; index++) {
      preloadedImages[index] = getImageAssetUrl(listImages[index]);
      console.log(
        `[preloadImage] [${index + 1}/${totalImages}] ${listImages[index]} → asset URL`
      );
    }
    console.log(
      `[preloadImage] DONE – all ${totalImages} asset URLs registered`
    );
  }

  const [userSettings, setUserSettings] = React.useState<IUserSettings>({
    Double_Page_Mode: false,
    Blank_page_At_Begginning: false,
    No_Double_Page_For_Horizontal: false,
    Manga_Mode: false,
    webToonMode: false,
    Automatic_Background_Color: false,
    SlideShow_Time: 0,
    SlideShow: false,
    NoBar: false,
    SideBar: false,
    Page_Counter: false,
    Vertical_Reader_Mode: false,
    Background_color: 'rgba(0,0,0,0)',
    Scroll_bar_visible: false,
    Smart_Panel_Mode: false,
  });

  async function getUserConfig() {
    try {
      const data = (await TauriAPI.getUserConfig()) as any;
      const newConfig = typeof data === 'string' ? JSON.parse(data) : data;
      for (const key in newConfig) {
        if (Object.prototype.hasOwnProperty.call(newConfig, key)) {
          const element = newConfig[key];
          if (element === 'true') {
            newConfig[key] = true;
          } else if (element === 'false') {
            newConfig[key] = false;
          }
        }
      }
      setUserSettings(newConfig);
    } catch (error) {
      console.log(error);
    }
  }

  async function getBookID() {
    const currentPath = localStorage.getItem('currentBook') ?? '';
    const books = await TauriAPI.getBooksByPath(currentPath);
    if (books.length > 0) {
      bookID = books[0].id;
    } else {
      bookID = 'NaID_' + Math.random() * 100500;
    }
  }

  async function getFromDBLastPage(): Promise<number> {
    const currentPath = localStorage.getItem('currentBook') ?? '';
    const books = await TauriAPI.getBooksByPath(currentPath);
    if (books.length > 0 && books[0].reading_progress) {
      return books[0].reading_progress.last_page ?? 0;
    }
    return 0;
  }

  async function prepareReader() {
    const t_prepare = performance.now();
    console.log(`[prepareReader] START – ${listofImg.length} images`);

    sessionCacheBust = Date.now();
    preloadedImages.length = 0;
    setImageOne(null);
    setImageTwo(null);

    TauriAPI.clearPanelCache().catch(() => {});
    const promise = new Promise((resolve, reject) => {
      Logger.info('Preparing Reader');
      if (listofImg.length === 0) {
        reject(t('no-images-to-load'));
        return;
      }
      const currentPage_ls = localStorage.getItem('currentPage');
      localStorage.removeItem('currentPage');
      setCurrentPage(currentPage_ls === null ? 0 : parseInt(currentPage_ls));
      const filepage = currentPage_ls === null ? 0 : parseInt(currentPage_ls);

      const t_cfg = performance.now();
      getUserConfig()
        .then(() => {
          console.log(
            `[prepareReader] getUserConfig in ${(performance.now() - t_cfg).toFixed(1)}ms`
          );
          const t_bid = performance.now();
          return getBookID().then(() => {
            console.log(
              `[prepareReader] getBookID in ${(performance.now() - t_bid).toFixed(1)}ms`
            );
          });
        })
        .then(async () => {
          if (LAZY_PRELOAD) {
            let startPage = filepage;
            if (startPage === 0) {
              const t_lp = performance.now();
              startPage = await getFromDBLastPage();
              console.log(
                `[prepareReader] getFromDBLastPage=${startPage} in ${(performance.now() - t_lp).toFixed(1)}ms`
              );
              setCurrentPage(startPage);
            }

            const pagesToEager = [startPage];
            if (startPage > 0) pagesToEager.push(startPage - 1);

            const t_eager = performance.now();
            console.log(
              `[prepareReader] eager-loading pages: ${pagesToEager.join(', ')}`
            );
            pagesToEager.forEach((p) => loadSingleImage(listofImg, p));
            console.log(
              `[prepareReader] eager load DONE in ${(performance.now() - t_eager).toFixed(1)}ms – showing reader`
            );

            await Reader(listofImg, startPage);
            console.log(
              `[prepareReader] Reader called – total to first frame: ${(performance.now() - t_prepare).toFixed(1)}ms`
            );
            resolve('done');

            startBackgroundPreload(listofImg, startPage);
          } else {
            const t_preload = performance.now();
            console.log(
              `[prepareReader] (legacy) preloading all ${listofImg.length} images`
            );
            preloadAllImages(listofImg);
            console.log(
              `[prepareReader] (legacy) preloadAll DONE in ${(performance.now() - t_preload).toFixed(1)}ms`
            );

            if (filepage !== 0) {
              await Reader(listofImg, filepage);
              resolve('done');
            } else {
              const t_lp = performance.now();
              const lastpage = await getFromDBLastPage();
              console.log(
                `[prepareReader] (legacy) getFromDBLastPage=${lastpage} in ${(performance.now() - t_lp).toFixed(1)}ms`
              );
              setCurrentPage(lastpage);
              await Reader(listofImg, lastpage);
              console.log(
                `[prepareReader] (legacy) DONE total=${(performance.now() - t_prepare).toFixed(1)}ms`
              );
              resolve('done');
            }
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
    ToasterHandlerPromise(
      promise,
      t('loading_cache'),
      t('loaded_local'),
      t('error_loading_local')
    );
    setUnzipStatus({
      status: 'finish',
      percentage: 100,
      current_file: '',
    });
    fixHeight();
  }

  const [BlankFirstPage, setBlankFirstPage] = React.useState(false);
  const [DPMNoH, setDPMNoH] = React.useState(false);
  const [mangaMode, setMangaMode] = React.useState(false);
  const [backgroundColorAuto, setBackgroundColorAuto] = React.useState(false);
  const [listofImgState, setListofImgState] = React.useState([]);

  React.useEffect(() => {
    const LaunchViewer = async () => {
      try {
        const data = (await TauriAPI.listExtractedImages()) as string[];
        listofImg = data.length === 0 ? [] : data;
        setListofImgState(data as any);
        setTotalPages(listofImg.length - 1);
      } catch (error) {
        console.log(error);
      }
    };

    if (listofImg.length === 0) {
      LaunchViewer();
    }
  }, []);

  const [bookmarked, setBookmarked] = React.useState(false);

  React.useEffect(() => {
    preloadedImages.length = 0;
    listofImg.length = 0;
  }, []);

  async function LoadBMI(pagec = 0) {
    try {
      const allBookmarks = await TauriAPI.getBookmarks(bookID);
      const found = allBookmarks.some((bm: any) => bm.page === pagec);
      setBookmarked(found);
    } catch (error) {
      console.log(error);
    }
  }

  async function Reader(_listOfImg: any[], page: number) {
    const images: any[] = [];
    console.log(preloadedImages);
    window.scrollTo(0, 0);
    images.push(preloadedImages[page]);
    images.push(preloadedImages[page - 1]);
    if (DoublePageMode && !BlankFirstPage && !DPMNoH) {
      if (mangaMode) {
        setImageOne(images[1]);
        setImageTwo(images[0]);
        setCurrentPage(page + 1);
      } else {
        setImageOne(images[0]);
        setImageTwo(images[1]);
        setCurrentPage(page + 1);
      }
    } else if (DoublePageMode && BlankFirstPage && !DPMNoH) {
      if (!(page === 0 || page === -1)) {
        if (mangaMode) {
          setImageOne(images[1]);
          setImageTwo(images[0]);
          setCurrentPage(page + 1);
        } else {
          setImageOne(images[0]);
          setImageTwo(images[1]);
          setCurrentPage(page + 1);
        }
      } else {
        setImageOne(images[0]);
        setImageTwo(null);
      }
    } else if (DoublePageMode && !BlankFirstPage && DPMNoH) {
      const imgn0 = new Image();
      imgn0.src = images[0];
      const imgn1 = new Image();
      imgn1.src = images[1];
      if (imgn0.naturalWidth > imgn0.naturalHeight) {
        setImageOne(null);
        setImageTwo(images[0]);
        setCurrentPage(page);
      } else if (imgn1.naturalWidth > imgn1.naturalHeight) {
        setImageOne(null);
        setImageTwo(images[1]);
        setCurrentPage(page);
      } else if (mangaMode) {
        setImageOne(images[1]);
        setImageTwo(images[0]);
        setCurrentPage(page + 1);
      } else {
        setImageOne(images[0]);
        setImageTwo(images[1]);
        setCurrentPage(page + 1);
      }
    } else if (DoublePageMode && BlankFirstPage && DPMNoH) {
      const imgn0 = new Image();
      imgn0.src = images[0];
      const imgn1 = new Image();
      imgn1.src = images[1];
      if (imgn0.naturalWidth > imgn0.naturalHeight) {
        setImageOne(null);
        setImageTwo(images[0]);
        setCurrentPage(page);
      } else if (imgn1.naturalWidth > imgn1.naturalHeight) {
        setImageOne(null);
        setImageTwo(images[1]);
        setCurrentPage(page);
      } else if (page === 0 || page === -1) {
        setImageOne(images[0]);
        setImageTwo(null);
      } else if (mangaMode) {
        setImageOne(images[1]);
        setImageTwo(images[0]);
        setCurrentPage(page + 1);
      } else {
        setImageOne(images[0]);
        setImageTwo(images[1]);
        setCurrentPage(page + 1);
      }
    } else {
      setImageOne(images[0]);
    }
    setTimeout(() => {
      if (backgroundColorAuto) {
        Logger.info('ColorThief : Enable');
        const colorThief = new ColorThief();
        try {
          const dummyImgElement = document.createElement('img');
          dummyImgElement.src = images[0];
          const color = colorThief.getColor(dummyImgElement);
          if (!color) return;
          const [r, g, b] = color;
          const darker = `rgb(${Math.floor(r * 0.6)}, ${Math.floor(
            g * 0.6
          )}, ${Math.floor(b * 0.6)})`;

          setTimeout(() => {
            const body = document.getElementsByTagName('body')[0];
            body.style.transition = 'background 0.5s ease-in-out 0.5s';
            body.style.background = `linear-gradient(to left top, rgb(${r}, ${g}, ${b}), ${darker}) no-repeat fixed`;
          }, 500);
        } catch (e) {
          console.error('ColorThief error:', e);
        }
      }
    }, 50);

    await LoadBMI(page);
  }

  let scrollindex_next = 1;
  const [VIV_On, setVIV_On] = React.useState(false);
  const [VIV_Count, setVIV_Count] = React.useState(0);

  function NextPage(override = false) {
    if (mangaMode) {
      if (!override) {
        PreviousPage(true);
        return false;
      }
    }
    if (VIV_On || webToonMode) {
      console.log(scrollindex_next);
      const imgViewer_n0 = document.getElementById('imgViewer_' + currentPage);
      if (imgViewer_n0 === null) return;
      if (webToonMode) {
        if (scrollindex_next > 2) {
          if (!VIV_On) {
            Reader(listofImgState, currentPage + 1);
            setCurrentPage(currentPage + 1);
          } else {
            const imgViewer = document.getElementById(
              'imgViewer_' + (currentPage + 1)
            );
            if (imgViewer === null) return;
            window.scrollTo(
              0,
              imgViewer.offsetTop -
                document.getElementsByTagName('header')[0].offsetHeight
            );
            setCurrentPage(currentPage + 1);
          }
        } else {
          let divImgViewer = document.getElementById(
            'div_imgViewer_' + currentPage
          );
          if (divImgViewer === null) {
            divImgViewer = imgViewer_n0;
          }
          if (scrollindex_next === 1) {
            divImgViewer.scrollIntoView({
              block: 'center',
            });
          } else if (scrollindex_next === 2) {
            divImgViewer.scrollIntoView({
              block: 'end',
            });
          }
        }
        if (scrollindex_next > 2) {
          scrollindex_next = 1;
        } else {
          scrollindex_next++;
        }
      } else {
        const imgViewer = document.getElementById(
          'imgViewer_' + (currentPage + 1)
        );
        if (imgViewer === null) return;
        Logger.debug(
          imgViewer.offsetTop -
            document.getElementsByTagName('header')[0].offsetHeight +
            ''
        );
        window.scrollTo(
          0,
          imgViewer.offsetTop -
            document.getElementsByTagName('header')[0].offsetHeight
        );
        setCurrentPage(currentPage + 1);
      }
    } else {
      window.scrollTo(0, 0);
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
        if (currentPage === totalPages - 1) {
          TauriAPI.updateBookStatusOne('read', bookID);
        }
        TauriAPI.updateReadingProgress(bookID, currentPage).then(() => {
          Reader(listofImgState, currentPage + 1);
        });
      }
    }
  }

  async function TBM() {
    const allBookmarks = await TauriAPI.getBookmarks(bookID);
    const existing = allBookmarks.find((bm: any) => bm.page === currentPage);
    if (existing) {
      await TauriAPI.deleteBookmark(existing.id);
      ToasterHandler(t('bookmark_removed'), 'info');
      setBookmarked(false);
    } else {
      await TauriAPI.createBookmark(bookID, currentPage);
      ToasterHandler(t('bookmark_added'), 'success');
      setBookmarked(true);
    }
  }

  function PreviousPage(override = false) {
    if (mangaMode) {
      if (!override) {
        NextPage(true);
        return false;
      }
    }
    if (VIV_On) {
      if (scrollindex_next === 2 || scrollindex_next === 3) {
        const imgViewer = document.getElementById('imgViewer_' + currentPage);
        if (imgViewer === null) return;
        window.scrollTo(
          0,
          imgViewer.offsetTop -
            document.getElementsByTagName('header')[0].offsetHeight
        );
        scrollindex_next = 1;
      } else {
        const imgViewer = document.getElementById(
          'imgViewer_' + (currentPage - 1)
        );
        if (imgViewer === null) return;
        window.scrollTo(
          0,
          imgViewer.offsetTop -
            document.getElementsByTagName('header')[0].offsetHeight
        );
        scrollindex_next = 1;
      }
    } else {
      window.scrollTo(0, 0);
      if (DoublePageMode && !BlankFirstPage && !DPMNoH) {
        if (currentPage > 2) {
          setCurrentPage(currentPage - 3);

          Reader(listofImgState, currentPage - 3);
        } else if (currentPage - 1 !== -1) {
          setCurrentPage(currentPage - 1);

          Reader(listofImgState, currentPage - 1);
        }
      } else if (DoublePageMode && !BlankFirstPage && DPMNoH) {
        if (currentPage > 2) {
          setCurrentPage(currentPage - 3);

          Reader(listofImgState, currentPage - 3);
        } else if (currentPage - 2 !== -1) {
          setCurrentPage(currentPage - 2);

          Reader(listofImgState, currentPage - 2);
        }
      } else if (DoublePageMode && BlankFirstPage && !DPMNoH) {
        if (currentPage !== 0 && currentPage - 3 !== -1) {
          setCurrentPage(currentPage - 3);

          Reader(listofImgState, currentPage - 3);
        } else if (currentPage - 3 === -1) {
          setCurrentPage(currentPage - 2);

          Reader(listofImgState, currentPage - 2);
        }
      } else if (DoublePageMode && BlankFirstPage && DPMNoH) {
        setCurrentPage(currentPage - 2);

        Reader(listofImgState, currentPage - 2);
      } else if (currentPage !== 0) {
        setCurrentPage(currentPage - 1);

        Reader(listofImgState, currentPage - 1);
      }
    }
  }

  function listenForUnzipProgress() {
    listen('progress-update', (event: any) => {
      const data = event.payload;
      if (data.key === 'unzip') {
        setUnzipStatus({
          status: data.status,
          percentage: parseInt(data.percentage) || 0,
          current_file: data.current_file || '',
        });
      }
    });

    listen('unzip-progress', (event: any) => {
      const data = event.payload;
      setUnzipStatus({
        status: data.status,
        percentage: parseInt(data.percentage) || 0,
        current_file: data.current_file || '',
      });
    });
  }

  useKeyboardShortcuts({
    smartPanelMode,
    isPanelZoomed,
    rotation,
    zoomLevel,
    listofImgState,
    setIsPanelZoomed,
    setPanelTransform,
    setCurrentPanelIndex,
    setRotation,
    setZoomLevel,
    setCurrentPage,
    PreviousPage,
    NextPage,
    PreviousPanel,
    NextPanel,
    Reader,
  });
  useEffect(() => {
    const LaunchViewer = async () => {
      const curBook = localStorage.getItem('currentBook');
      if (curBook === null) return;

      isADirectory = (await TauriAPI.isDirectory(curBook)) as boolean;

      setBookLoaded(true);
      const path = curBook;
      Logger.info('CosmicComicsTempI : ' + CosmicComicsTempI);

      const isDir = (await TauriAPI.isDirectory(path)) as boolean;
      Logger.info('isDir CCTI: ' + isDir);

      if (isDir) {
        Logger.info('CCI is a directory');
        CosmicComicsTempI = `${path}/`;
        localStorage.setItem('CosmicComicsTempI', path + '/');
      }

      const existCCI = (await TauriAPI.pathExists(
        CosmicComicsTempI
      )) as boolean;
      Logger.info('existCCI : ' + existCCI);

      if (!existCCI) {
        Logger.info("CCI doesn't exist");

        listenForUnzipProgress();
        await TauriAPI.unzipBook(path);
        const images = (await TauriAPI.listExtractedImages()) as string[];
        listofImg = images.length === 0 ? [] : images;
        setListofImgState(images as any);
        setTotalPages(listofImg.length - 1);
        await prepareReader();
      } else if (isDir) {
        Logger.info('Trying to load images from CCI cache');
        const images = (await TauriAPI.listImagesInDirectory(
          CosmicComicsTempI
        )) as string[];
        listofImg = images.length === 0 ? [] : images;
        setListofImgState(images as any);
        setTotalPages(listofImg.length - 1);
        await prepareReader();
      } else {
        Logger.info('CCI is a file');

        const pathTxtPath = CosmicComicsTempI + 'path.txt';
        const existCCIP = (await TauriAPI.pathExists(pathTxtPath)) as boolean;
        Logger.info('path.txt exist? : ' + existCCIP);

        if (existCCIP) {
          const readCCTIP = (await TauriAPI.readTextFile(
            pathTxtPath
          )) as string;
          if (
            readCCTIP !== decodeURIComponent(path).replaceAll('%C3%B9', '/') ||
            path.includes('.pdf')
          ) {
            Logger.info('path.txt is not equal to path, Unzipping');
            listenForUnzipProgress();
            await TauriAPI.unzipBook(path);
            const images = (await TauriAPI.listExtractedImages()) as string[];
            listofImg = images.length === 0 ? [] : images;
            setListofImgState(images as any);
            setTotalPages(listofImg.length - 1);
            await prepareReader();
          } else {
            Logger.info('path.txt is equal to path, reading');
            const images = (await TauriAPI.listImagesInDirectory(
              CosmicComicsTempI
            )) as string[];
            listofImg = images.length === 0 ? [] : images;
            setListofImgState(images as any);
            setTotalPages(listofImg.length - 1);
            await prepareReader();
          }
        } else {
          Logger.info("path.txt doesn't exist, Unzipping");
          listenForUnzipProgress();
          await TauriAPI.unzipBook(path);
          const images = (await TauriAPI.listExtractedImages()) as string[];
          listofImg = images.length === 0 ? [] : images;
          setListofImgState(images as any);
          setTotalPages(listofImg.length - 1);
          await prepareReader();
        }
      }
    };
    if (!bookLoaded && CosmicComicsTemp !== '' && CosmicComicsTempI !== '') {
      LaunchViewer();
    }
  });

  const [opacityForNavigation, setOpacityForNavigation] = React.useState('0.1');

  const [openBookSettings, setOpenBookSettings] = React.useState(false);
  const [isMagnifierOn, setIsMagnifierOn] = React.useState(false);

  const handleOpenBookSettings = () => {
    setOpenBookSettings(true);
  };

  const handleCloseBookSettings = () => {
    setOpenBookSettings(false);
  };

  function isMouseAtTheTop(e: { clientY: number }) {
    if (e.clientY < 50) {
      setActionbarON(true);
    }
  }

  React.useLayoutEffect(() => {
    if (actionbarON) {
      document.querySelectorAll('header').forEach((el) => {
        el.style.display = 'inherit';
      });
      document.removeEventListener('mousemove', isMouseAtTheTop);
    } else {
      document.querySelectorAll('header').forEach((el) => {
        el.style.display = 'none';
      });
      document.addEventListener('mousemove', isMouseAtTheTop);
    }
    modifyConfigJson('NoBar', actionbarON);
  }, [actionbarON]);

  const {
    isSlideShowOn,
    setIsSlideShowOn,
    slideShowInterval,
    setSlideShowInterval,
  } = useSlideShow(NextPage);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting)
          setCurrentPage(
            parseInt(entries[0].target.id.split('div_imgViewer_')[1])
          );
        try {
          const idImg = document.getElementById('id_img_' + (currentPage - 1));
          const sidebar = document.getElementById('SideBar');
          if (idImg === null || sidebar === null) return;
          idImg.className = 'SideBar_current';
          sidebar.scrollTop = idImg.offsetTop - 200;
        } catch (e) {
          console.log(e);
        }
      },
      { threshold: [0.1] }
    );
    if (VIV_On) {
      setVIV_Count(preloadedImages.length);
      for (let i = 0; i < preloadedImages.length; i++) {
        const elHTML = document.querySelector('#div_imgViewer_' + i);
        if (elHTML === null) return;
        observer.observe(elHTML);
      }
    }
  }, [VIV_On, currentPage]);

  React.useLayoutEffect(() => {
    const sidebar = document.getElementById('SideBar');
    const idImg = document.getElementById('id_img_' + (currentPage - 1));
    if (sidebar === null || idImg === null) return;
    sidebar.scrollTop = (idImg.offsetTop - 200) | sidebar.scrollTop;
  }, [currentPage]);

  React.useEffect(() => {
    if (parseInt(baseWidth.toString()) >= window.innerWidth - 50) {
      setWebToonMode(true);
    } else {
      setWebToonMode(false);
    }
  }, [baseWidth]);

  React.useEffect(() => {
    if (!smartPanelMode || !imageOne) return;

    setIsTransitioning(true);
    setCurrentPanelIndex(-1);
    setIsPanelZoomed(false);
    setPanelTransform('');
    setPanels([]);

    const detectCurrentPagePanels = async () => {
      try {
        if (listofImgState.length === 0 || currentPage < 0) return;
        const pagePath = listofImgState[currentPage];
        if (!pagePath) return;
        const isDir =
          localStorage.getItem('currentBook') &&
          ((await TauriAPI.isDirectory(
            localStorage.getItem('currentBook') || ''
          )) as boolean);
        const method = isDir ? 'DL' : 'CLASSIC';
        const bookPath = isDir
          ? localStorage.getItem('currentBook') || undefined
          : undefined;

        const detected = await TauriAPI.detectPanels(
          pagePath,
          method,
          mangaMode,
          bookPath
        );
        setPanels(detected);

        setTimeout(() => setIsTransitioning(false), 50);

        const preloadPages: string[] = [];
        for (let i = 1; i <= 3; i++) {
          if (currentPage + i < listofImgState.length) {
            preloadPages.push(listofImgState[currentPage + i]);
          }
          if (currentPage - i >= 0) {
            preloadPages.push(listofImgState[currentPage - i]);
          }
        }
        if (preloadPages.length > 0) {
          TauriAPI.detectPanelsBatch(
            preloadPages,
            method,
            mangaMode,
            bookPath
          ).catch(() => {});
        }
      } catch (error) {
        console.error('Panel detection failed:', error);
        setPanels([]);
      }
    };
    detectCurrentPagePanels();
  }, [smartPanelMode, imageOne, currentPage, mangaMode, listofImgState]);

  function zoomToPanel(panel: PanelRect) {
    console.log('Zooming to panel:', panel);
    const imgEl = document.getElementById('imgViewer_0') as HTMLImageElement;
    if (!imgEl) {
      console.error('Image element not found');
      return;
    }

    const naturalW = imgEl.naturalWidth;
    const naturalH = imgEl.naturalHeight;
    if (naturalW === 0 || naturalH === 0) {
      console.error('Image not loaded yet');
      return;
    }

    const displayW = imgEl.offsetWidth;
    const displayH = imgEl.offsetHeight;

    console.log('Natural size:', naturalW, naturalH);
    console.log('Display size:', displayW, displayH);

    const scaleX = displayW / naturalW;
    const scaleY = displayH / naturalH;

    const panelDisplayX = panel.x * scaleX;
    const panelDisplayY = panel.y * scaleY;
    const panelDisplayW = panel.w * scaleX;
    const panelDisplayH = panel.h * scaleY;

    console.log('Panel in display coords:', {
      x: panelDisplayX,
      y: panelDisplayY,
      w: panelDisplayW,
      h: panelDisplayH,
    });

    const imgOriginX = typeof origins[0]?.[0] === 'number' ? origins[0][0] : 0;
    const imgOriginY = typeof origins[0]?.[1] === 'number' ? origins[0][1] : 0;
    console.log('Image origin:', { x: imgOriginX, y: imgOriginY });

    const panelCenterAbsX = imgOriginX + panelDisplayX + panelDisplayW / 2;
    const panelCenterAbsY = imgOriginY + panelDisplayY + panelDisplayH / 2;
    console.log('Panel center (absolute):', {
      x: panelCenterAbsX,
      y: panelCenterAbsY,
    });

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const headerHeight =
      document.getElementsByTagName('header')[0]?.offsetHeight || 0;
    const availableHeight = viewportH - headerHeight;
    const padding = 40;

    const zoomX = (viewportW - padding * 2) / panelDisplayW;
    const zoomY = (availableHeight - padding * 2) / panelDisplayH;
    const zoom = Math.min(zoomX, zoomY, 3.5);

    console.log('Calculated zoom:', zoom);

    const targetX = viewportW / 2;
    const targetY = headerHeight + availableHeight / 2;
    console.log('Target position:', { x: targetX, y: targetY });

    const tx = targetX - panelCenterAbsX * zoom;
    const ty = targetY - panelCenterAbsY * zoom;

    console.log('Translation:', { tx, ty });

    const transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    console.log('Final transform:', transform);
    setPanelTransform(transform);
    setIsPanelZoomed(true);
  }

  function NextPanel() {
    if (!smartPanelMode || panels.length === 0) {
      NextPage();
      return;
    }
    const nextIdx = currentPanelIndex + 1;
    if (nextIdx < panels.length) {
      setIsPanelZoomed(false);
      setPanelTransform('scale(1)');
      setTimeout(() => {
        setCurrentPanelIndex(nextIdx);
        zoomToPanel(panels[nextIdx]);
      }, 400);
    } else {
      setIsTransitioning(true);
      setCurrentPanelIndex(-1);
      setIsPanelZoomed(false);
      setPanelTransform('');
      setTimeout(() => {
        NextPage();
      }, 50);
    }
  }

  function PreviousPanel() {
    if (!smartPanelMode || panels.length === 0) {
      PreviousPage();
      return;
    }
    const prevIdx = currentPanelIndex - 1;
    if (prevIdx >= 0) {
      setIsPanelZoomed(false);
      setPanelTransform('scale(1)');
      setTimeout(() => {
        setCurrentPanelIndex(prevIdx);
        zoomToPanel(panels[prevIdx]);
      }, 400);
    } else {
      setIsTransitioning(true);
      setCurrentPanelIndex(-1);
      setIsPanelZoomed(false);
      setPanelTransform('');
      setTimeout(() => {
        PreviousPage();
      }, 50);
    }
  }

  React.useLayoutEffect(() => {
    setTimeout(() => {
      const overlay = document.getElementById('overlay');
      if (overlay !== null) {
        if (unzipStatus.status === 'finish' || unzipStatus.status === 'done') {
          overlay.style.display = 'none';
        } else {
          overlay.style.display = 'block';
        }
      }
    }, 500);
  }, [unzipStatus]);

  return (
    <>
      <div className="flex">
        <ViewerHeader
          open={open}
          isFullscreen={isFullscreen}
          onDrawerOpen={handleDrawerOpen}
          onGoBack={() => (window.location.href = '/collectionner')}
          onFixWidth={fixWidth}
          onFixHeight={fixHeight}
          onRecenter={recenter}
          onToggleFullscreen={async () => {
            if (await appWindow.isFullscreen()) {
              await appWindow.setFullscreen(false);
              setIsFullscreen(false);
            } else {
              await appWindow.setFullscreen(true);
              setIsFullscreen(true);
            }
          }}
          onOpenBookSettings={handleOpenBookSettings}
          TBM={TBM}
          bookmarked={bookmarked}
          rotation={rotation}
          setRotation={setRotation}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isMagnifierOn={isMagnifierOn}
          setIsMagnifierOn={setIsMagnifierOn}
        />

        <ViewerSidebar
          open={open}
          onClose={handleDrawerClose}
          preloadedImages={preloadedImages}
          currentPage={currentPage}
          onPageClick={(i) => {
            setCurrentPage(i);
            if (!VIV_On) {
              Reader(listofImg, i);
            } else {
              const imgViewer = document.getElementById('imgViewer_' + i);
              if (imgViewer === null) return;
              imgViewer.scrollIntoView({ block: 'center' });
            }
          }}
        />
        <main
          className={`flex-1 transition-all duration-200 p-0 ${open ? 'ml-60' : 'ml-0'}`}
        >
          <ViewerLoadingOverlay unzipStatus={unzipStatus} />

          <ViewerImageDisplay
            VIV_On={VIV_On}
            isMagnifierOn={isMagnifierOn}
            smartPanelMode={smartPanelMode}
            isPanelZoomed={isPanelZoomed}
            isTransitioning={isTransitioning}
            panelTransform={panelTransform}
            imageOne={imageOne}
            imageTwo={imageTwo}
            origins={origins}
            baseWidth={baseWidth}
            baseHeight={baseHeight}
            zoomLevel={zoomLevel}
            rotation={rotation}
            preloadedImages={preloadedImages}
          />
          <ViewerPanelDebugOverlay
            smartPanelMode={smartPanelMode}
            showDebugOverlay={showPanelDebugOverlay}
            panels={panels}
            imageOne={imageOne}
            VIV_On={VIV_On}
            webToonMode={webToonMode}
            currentPanelIndex={currentPanelIndex}
            origins={origins}
            isPanelZoomed={isPanelZoomed}
            isTransitioning={isTransitioning}
            panelTransform={panelTransform}
          />

          <ViewerNavigationControls
            opacityForNavigation={opacityForNavigation}
            setOpacityForNavigation={setOpacityForNavigation}
            currentPage={currentPage}
            totalPages={totalPages}
            smartPanelMode={smartPanelMode}
            panels={panels}
            currentPanelIndex={currentPanelIndex}
            onSkipBack={() => {
              setCurrentPage(0);
              if (VIV_On || webToonMode) window.scrollTo(0, 0);
              else Reader(listofImgState, 0);
            }}
            onPrev={() => (smartPanelMode ? PreviousPanel() : PreviousPage())}
            onNext={() => (smartPanelMode ? NextPanel() : NextPage())}
            onSkipEnd={() => {
              const max = DoublePageMode ? totalPages - 1 : totalPages;
              setCurrentPage(totalPages);
              TauriAPI.updateBookStatusOne('read', bookID).then(() => {
                if (VIV_On || webToonMode)
                  window.scrollTo(0, document.body.scrollHeight);
                else Reader(listofImgState, max);
              });
            }}
          />
        </main>
      </div>

      <ReaderSettingsDialog
        openModal={openBookSettings}
        onClose={handleCloseBookSettings}
        Reader={Reader}
        LOI={listofImgState}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setDoublePageMode={setDoublePageMode}
        setBlankFirstPage={setBlankFirstPage}
        setDPMNoH={setDPMNoH}
        setActionbarON={setActionbarON}
        actionbarON={actionbarON}
        slideShow={isSlideShowOn}
        setSlideShow={setIsSlideShowOn}
        slideShowInterval={slideShowInterval}
        setSlideShowInterval={setSlideShowInterval}
        mangaMode={mangaMode}
        setMangaMode={setMangaMode}
        VIV_On={VIV_On}
        setVIVOn={setVIV_On}
        setWebToonMode={setWebToonMode}
        fixWidth={fixWidth}
        fixHeight={fixHeight}
        setBackgroundColorAuto={setBackgroundColorAuto}
        backgroundColorAuto={backgroundColorAuto}
        userSettings={userSettings}
        smartPanelMode={smartPanelMode}
        setSmartPanelMode={setSmartPanelMode}
        showPanelDebugOverlay={showPanelDebugOverlay}
        setShowPanelDebugOverlay={setShowPanelDebugOverlay}
      />
    </>
  );

  function recenter() {
    setOrigins([
      [0, 0],
      [0, 0],
    ]);
    setZoomLevel(1);
    setRotation(0);
    setBaseWidth('auto');
    setBaseHeight(window.innerHeight - 100);

    if (isPanelZoomed) {
      setIsPanelZoomed(false);
      setPanelTransform('');
      setCurrentPanelIndex(-1);
    }
    setTimeout(() => {
      setOrigins(originsKept);
    }, 50);
  }

  function fixHeight() {
    const headers = document.getElementsByTagName('header');
    if (headers.length === 0) return;
    const navbar = headers[0];

    setZoomLevel(0);
    setBaseWidth('auto');

    if (VIV_On) {
      setBaseHeight(window.innerHeight - navbar.offsetHeight - 15);
    } else if (!actionbarON) {
      setBaseHeight(window.innerHeight);
    } else {
      setBaseHeight(window.innerHeight - navbar.offsetHeight - 15);
      const tempOrigin = origins;
      if (origins[0][0] !== 0 || origins[1][0] !== 0) {
        setOrigins([
          [0, 0],
          [0, 0],
        ]);
        setTimeout(() => {
          setOrigins(tempOrigin);
        }, 50);
      } else {
        setOrigins(originsKept);
      }
    }
  }

  function fixWidth() {
    setBaseWidth(window.innerWidth - 5);
    setBaseHeight('auto');
    setZoomLevel(0);
    setOrigins([
      [0, 0],
      [0, 0],
    ]);
    if (DoublePageMode) {
      setBaseWidth((window.innerWidth - 5) / 2);
    }
    if (sidebarON) {
      setBaseWidth(window.innerWidth - 205);
    }
    if (VIV_On) {
      for (let i = 0; i < VIV_Count; i++) {
        if (sidebarON) {
          setBaseWidth(window.innerWidth - 205);
        } else {
          setBaseWidth(window.innerWidth - 5);
        }
      }
    }
  }
}
