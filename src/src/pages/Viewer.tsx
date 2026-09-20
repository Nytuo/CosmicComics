import ViewerDrawer from '@/components/viewer/ViewerDrawer.tsx';
import { lazy, Suspense } from 'react';

const EpubReader = lazy(() => import('@/components/viewer/EpubReader.tsx'));
import { useEffect } from 'react';
import * as TauriAPI from '@/API/TauriAPI';

function Viewer() {
  const book = localStorage.getItem('currentBook') ?? '';
  const isEpub = book.toLowerCase().endsWith('.epub');

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

  return (
    <>
      {isEpub ? (
        <Suspense fallback={null}>
          <EpubReader path={book} />
        </Suspense>
      ) : (
        <ViewerDrawer />
      )}
    </>
  );
}

export default Viewer;
