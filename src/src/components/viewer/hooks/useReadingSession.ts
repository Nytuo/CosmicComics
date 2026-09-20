import * as React from 'react';
import { ReadingSessionTracker } from '@/API/StatsAPI';
import { resolveSessionMeta } from '@/utils/readingSession';

export function useReadingSession(
  currentPage: number,
  secondPageShown: boolean,
  lastIndex: number
) {
  const tracker = React.useRef<ReadingSessionTracker | null>(null);
  const latest = React.useRef({ page: 0, count: 0 });
  React.useLayoutEffect(() => {
    latest.current = {
      page: Math.min(lastIndex, currentPage + (secondPageShown ? 1 : 0)),
      count: lastIndex + 1,
    };
  });

  React.useEffect(() => {
    const path = localStorage.getItem('currentBook');
    if (!path || lastIndex <= 0 || tracker.current) return;
    let cancelled = false;
    resolveSessionMeta(path).then((meta) => {
      if (cancelled) return;
      const session = new ReadingSessionTracker(meta);
      session.update(latest.current.page, latest.current.count);
      session.start();
      tracker.current = session;
    });
    return () => {
      cancelled = true;
    };
  }, [lastIndex]);

  React.useEffect(() => {
    tracker.current?.update(latest.current.page, latest.current.count);
  }, [currentPage, secondPageShown]);

  React.useEffect(
    () => () => {
      tracker.current?.stop();
      tracker.current = null;
    },
    []
  );
}
