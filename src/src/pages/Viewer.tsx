import ViewerDrawer from '@/components/viewer/ViewerDrawer.tsx';
import { useEffect } from 'react';
import * as TauriAPI from '@/API/TauriAPI';

function Viewer() {
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
      <ViewerDrawer />
    </>
  );
}

export default Viewer;
