import * as React from 'react';
import * as JellyfinAPI from '@/API/JellyfinAPI';

const REPORT_DELAY_MS = 1500;

export function useJellyfinProgress(
  currentPage: number,
  secondPageShown: boolean,
  lastIndex: number
) {
  const session = React.useMemo(() => JellyfinAPI.readJellyfinSession(), []);
  const latest = React.useRef<{ page: number; count: number } | null>(null);
  const sent = React.useRef<number | null>(null);
  const baseline = React.useRef<number | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  const flush = React.useCallback(() => {
    window.clearTimeout(timer.current);
    const report = latest.current;
    if (!session || !report || sent.current === report.page) return;
    sent.current = report.page;
    JellyfinAPI.reportProgress(
      session.serverId,
      session.itemId,
      report.page,
      report.count
    ).catch((e) => console.warn('Jellyfin progress not saved:', e));
  }, [session]);

  React.useEffect(() => {
    if (!session || lastIndex <= 0) return;
    const page = Math.min(lastIndex, currentPage + (secondPageShown ? 1 : 0));
    if (baseline.current === null) {
      baseline.current = page;
      sent.current = page;
      return;
    }
    latest.current = { page, count: lastIndex + 1 };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, REPORT_DELAY_MS);
  }, [session, currentPage, secondPageShown, lastIndex, flush]);

  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);
}
