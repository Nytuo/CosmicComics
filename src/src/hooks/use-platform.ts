import * as React from 'react';
import {
  getPlatformCapabilities,
  type PlatformCapabilities,
} from '@/API/TauriAPI';

const looksMobile =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const GUESS: PlatformCapabilities = {
  platform: looksMobile ? 'mobile' : 'desktop',
  mobile: looksMobile,
  ai: !looksMobile,
  downloaders: !looksMobile,
  pdf: !looksMobile,
  documents: true,
  updater: !looksMobile,
  local_import: looksMobile,
  extensions: [],
};

let cached: PlatformCapabilities | null = null;
let pending: Promise<PlatformCapabilities> | null = null;

export function loadPlatform(): Promise<PlatformCapabilities> {
  if (cached) return Promise.resolve(cached);
  pending ??= getPlatformCapabilities()
    .then((caps) => (cached = caps))
    .catch(() => (cached = GUESS));
  return pending;
}

export function usePlatform(): PlatformCapabilities {
  const [caps, setCaps] = React.useState<PlatformCapabilities>(cached ?? GUESS);
  React.useEffect(() => {
    let alive = true;
    loadPlatform().then((loaded) => alive && setCaps(loaded));
    return () => {
      alive = false;
    };
  }, []);
  return caps;
}
