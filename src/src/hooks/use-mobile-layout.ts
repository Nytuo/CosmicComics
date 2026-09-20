import * as React from 'react';
import { usePlatform } from '@/hooks/use-platform.ts';

const NARROW_BREAKPOINT = 768;

const isNarrow = () =>
  typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT;

/**
 * Whether to render the phone UI (bottom navigation, drawers, touch viewer).
 * True on Android/iOS builds, and on a desktop window narrowed to phone width
 * so the responsive behaviour still works when resizing.
 */
export function useMobileLayout(): boolean {
  const { mobile } = usePlatform();
  const [narrow, setNarrow] = React.useState(isNarrow);

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const update = () => setNarrow(isNarrow());
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return mobile || narrow;
}
