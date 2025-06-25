/* eslint-disable react-hooks/exhaustive-deps */
import CollectionnerDrawer from '@/components/collectionner/CollectionnerManager.tsx';
import React, { useEffect } from 'react';
import * as TauriAPI from '@/API/TauriAPI';

function Collectionner() {
  const [, setCosmicComicsData] = React.useState(
    'C:/Users/Public/Cosmic-Comics/data'
  );
  const [CosmicComicsTemp, setCosmicComicsTemp] = React.useState(
    'C:/Users/Public/Cosmic-Comics/temp'
  );
  const [, setCosmicComicsTempI] = React.useState('setCosmicComicsData');
  useEffect(() => {
    document.title = 'Collectionner';
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const basePath = (await TauriAPI.getBasePath()) as string;
        setCosmicComicsTemp(basePath);
        setCosmicComicsData(basePath + '/CosmicComics_data');
        setCosmicComicsTempI(basePath + '/current_book/');
      } catch (error) {
        console.log(error);
      }
    };
    fetchLocation();
  }, []);
  return (
    <>
      <CollectionnerDrawer CosmicComicsTemp={CosmicComicsTemp} />
    </>
  );
}

export default Collectionner;
