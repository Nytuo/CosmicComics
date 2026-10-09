import * as React from 'react';

const KEY = 'forceOfflineMode';
const EVENT = 'force-offline-change';

export function isForceOffline(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setForceOffline(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // ignored: storage unavailable, the toggle just won't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useForceOffline(): [boolean, (on: boolean) => void] {
  const [on, setOn] = React.useState(isForceOffline);

  React.useEffect(() => {
    const sync = () => setOn(isForceOffline());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return [on, setForceOffline];
}
