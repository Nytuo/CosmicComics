import * as React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import * as TauriAPI from '@/API/TauriAPI';
import { extractBook } from '@/utils/bookPages.ts';

export interface BookPages {
  status: 'loading' | 'ready' | 'error';
  percentage: number;
  currentFile: string;
  pages: string[];
  error: string | null;
  reload: () => void;
}

type Progress = (percentage: number, file: string) => void;

interface Loaded {
  pages: string[];
}

let inflight: {
  path: string;
  task: Promise<Loaded>;
  ticks: Set<Progress>;
} | null = null;

async function resolveFiles(
  bookPath: string,
  basePath: string,
  isDir: boolean,
  report: Progress
): Promise<string[]> {
  const extractAndList = async () => {
    await extractBook(bookPath, report);
    return TauriAPI.listExtractedImages();
  };

  if (isDir) return TauriAPI.listImagesInDirectory(`${bookPath}/`);

  const cacheDir = `${basePath}/current_book/`;
  if (!(await TauriAPI.pathExists(cacheDir))) return extractAndList();

  const marker = `${cacheDir}path.txt`;
  if (!(await TauriAPI.pathExists(marker))) return extractAndList();
  const cachedFor = await TauriAPI.readTextFile(marker);
  const same =
    cachedFor === decodeURIComponent(bookPath).replaceAll('%C3%B9', '/') &&
    !bookPath.includes('.pdf');
  return same ? TauriAPI.listImagesInDirectory(cacheDir) : extractAndList();
}

function loadBook(bookPath: string, onProgress: Progress): Promise<Loaded> {
  if (inflight?.path === bookPath) {
    inflight.ticks.add(onProgress);
    return inflight.task;
  }
  const ticks = new Set<Progress>([onProgress]);
  const report: Progress = (p, f) => ticks.forEach((tick) => tick(p, f));

  const task = (async () => {
    const [basePath, isDir] = await Promise.all([
      TauriAPI.getBasePath(),
      TauriAPI.isDirectory(bookPath),
    ]);
    type ProgressPayload = {
      key?: string;
      percentage?: string;
      current_file?: string;
    };
    const forward = ({ payload }: { payload: ProgressPayload }) =>
      report(
        parseInt(payload.percentage ?? '0') || 0,
        payload.current_file ?? ''
      );
    const stops = await Promise.all([
      listen<ProgressPayload>('unzip-progress', forward),
      listen<ProgressPayload>('progress-update', (event) => {
        if (event.payload.key === 'unzip') forward(event);
      }),
    ]);
    try {
      const files = await resolveFiles(bookPath, basePath, isDir, report);
      if (files.length === 0) throw new Error('no-images-to-load');
      const dir = isDir ? bookPath : `${basePath}/current_book`;
      const bust = Date.now();
      return {
        pages: files.map(
          (file) => `${convertFileSrc(`${dir}/${file}`)}?v=${bust}`
        ),
      };
    } finally {
      stops.forEach((stop) => stop());
    }
  })().finally(() => {
    if (inflight?.task === task) inflight = null;
  });

  inflight = { path: bookPath, task, ticks };
  return task;
}

export function useBookPages(): BookPages {
  const [state, setState] = React.useState<Omit<BookPages, 'reload'>>({
    status: 'loading',
    percentage: 0,
    currentFile: '',
    pages: [],
    error: null,
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const bookPath = localStorage.getItem('currentBook');
    if (!bookPath) {
      setState((s) => ({ ...s, status: 'error', error: 'no-images-to-load' }));
      return;
    }
    let alive = true;
    setState({
      status: 'loading',
      percentage: 0,
      currentFile: '',
      pages: [],
      error: null,
    });

    loadBook(bookPath, (percentage, currentFile) => {
      if (alive) setState((s) => ({ ...s, percentage, currentFile }));
    })
      .then(({ pages }) => {
        if (alive)
          setState({
            status: 'ready',
            percentage: 100,
            currentFile: '',
            pages,
            error: null,
          });
      })
      .catch((error) => {
        if (alive)
          setState((s) => ({
            ...s,
            status: 'error',
            error: String(error?.message ?? error),
          }));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const reload = React.useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
