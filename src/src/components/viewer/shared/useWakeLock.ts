import * as React from 'react';

/** Keeps the screen on while reading (Screen Wake Lock API; silently a no-op where unsupported). */
export function useWakeLock(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
        else sentinel = lock;
      } catch {
        /* denied (low battery, background tab…) */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
