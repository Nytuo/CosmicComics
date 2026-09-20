import ViewerDrawer from '@/components/viewer/ViewerDrawer.tsx';
import { lazy, Suspense } from 'react';

const EpubReader = lazy(() => import('@/components/viewer/EpubReader.tsx'));
const MobileViewer = lazy(
  () => import('@/components/viewer/mobile/MobileViewer.tsx')
);
import { useEffect, useState } from 'react';
import * as TauriAPI from '@/API/TauriAPI';
import { loadPlatform } from '@/hooks/use-platform.ts';
import { useMobileLayout } from '@/hooks/use-mobile-layout.ts';

function Viewer() {
  const book = localStorage.getItem('currentBook') ?? '';
  const isEpub = book.toLowerCase().endsWith('.epub');
  const mobile = useMobileLayout();
  const [platformKnown, setPlatformKnown] = useState(false);

  useEffect(() => {
    loadPlatform().then(() => setPlatformKnown(true));
  }, []);

  useEffect(() => {
    document.title = 'Viewer';
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const basePath = (await TauriAPI.getBasePath()) as string;
        localStorage.setItem('CosmicComicsTemp', basePath);
        localStorage.setItem(
          'CosmicComicsData',
          basePath + '/CosmicComics_data'
        );
        localStorage.setItem('CosmicComicsTempI', basePath + '/current_book/');
      } catch (error) {
        console.log(error);
      }
    };
    fetchLocation();
  }, []);

  if (!platformKnown) return null;

  return (
    <>
      {isEpub ? (
        <Suspense fallback={null}>
          <EpubReader path={book} />
        </Suspense>
      ) : mobile ? (
        <Suspense fallback={null}>
          <MobileViewer />
        </Suspense>
      ) : (
        <ViewerDrawer />
      )}
    </>
  );
}

export default Viewer;
