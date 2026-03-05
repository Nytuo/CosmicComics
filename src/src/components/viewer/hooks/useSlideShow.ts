import * as React from 'react';
import { modifyConfigJson } from '@/utils/Fetchers.ts';

export function useSlideShow(NextPage: () => void) {
  const [isSlideShowOn, setIsSlideShowOn] = React.useState(false);
  const [slideShowInterval, setSlideShowInterval] = React.useState(5000);

  React.useEffect(() => {
    modifyConfigJson('SlideShow', isSlideShowOn);
    if (isSlideShowOn) {
      const interval = setInterval(() => {
        NextPage();
      }, slideShowInterval);
      return () => clearInterval(interval);
    }
  }, [NextPage, isSlideShowOn, slideShowInterval]);

  return {
    isSlideShowOn,
    setIsSlideShowOn,
    slideShowInterval,
    setSlideShowInterval,
  };
}
