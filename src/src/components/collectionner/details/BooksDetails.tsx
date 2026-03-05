import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import ContentViewer from './ContentViewer.tsx';
import { useEffect, useState } from 'react';
import * as TauriAPI from '@/API/TauriAPI.ts';

function BooksDetails({
  stateDetails,
  handleAddBreadcrumbs,
  onDelete,
  onBack,
}: {
  stateDetails: {
    open: boolean;
    book: DisplayBook | DisplaySeries;
    provider: any;
  };
  handleAddBreadcrumbs: any;
  onDelete?: () => void;
  onBack?: () => void;
}) {
  const [book, setBook] = useState<DisplayBook | DisplaySeries>(
    stateDetails.book
  );

  useEffect(() => {
    handleAddBreadcrumbs(stateDetails.book.title, () => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBook((prev) => {
      if (prev.id === stateDetails.book.id) return prev;
      return stateDetails.book;
    });
  }, [stateDetails.book]);

  const handleRefresh = async () => {
    try {
      const refreshedBook = await TauriAPI.getBookById(book.id);
      if (refreshedBook) {
        setBook(refreshedBook);
      }
    } catch (err) {
      console.error('Failed to refresh book:', err);
    }
  };

  return (
    <>
      {stateDetails ? (
        stateDetails.open ? (
          <ContentViewer
            type={'volume'}
            provider={book.provider_id}
            TheBook={book}
            handleAddBreadcrumbs={handleAddBreadcrumbs}
            onDelete={onDelete}
            onRefresh={handleRefresh}
            onBack={onBack}
          />
        ) : (
          <></>
        )
      ) : (
        <></>
      )}
    </>
  );
}

export default BooksDetails;
