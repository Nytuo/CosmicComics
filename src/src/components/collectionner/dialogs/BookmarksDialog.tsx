import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import { openBOOKM } from '@/utils/utils.ts';
import { Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function BookmarksDialog({
  onClose,
  openModal,
}: {
  onClose: any;
  openModal: boolean;
}) {
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = React.useState<any[]>([]);

  const listBM = async () => {
    try {
      const info = (await TauriAPI.getBookmarks()) as any[];
      for (const file of info) {
        try {
          const book = await TauriAPI.getBookById(
            file['book_id'] ?? file['BOOK_ID']
          );
          setBookmarks((prev) => [
            ...prev,
            {
              URLCover: book.cover_url,
              page: file['page'],
              path: book.path,
              title: book.title,
            },
          ]);
        } catch {
          /* empty */
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  React.useLayoutEffect(() => {
    listBM();
  }, []);

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:w-150">
        <DialogHeader>
          <DialogTitle>{t('Bookmark')}</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4 py-4">
          {bookmarks.length > 0 ? (
            bookmarks.map((bookmark: any, index: number) => (
              <div key={index} className="space-y-1">
                <img
                  src={bookmark.URLCover}
                  onError={(e: any) => {
                    e.target.src = 'Images/fileDefault.webp';
                  }}
                  alt={bookmark.title}
                  className="h-37.5 w-auto mx-auto"
                />
                <Button
                  variant="link"
                  onClick={() => {
                    openBOOKM(bookmark.path, bookmark.page);
                  }}
                >
                  {t('Seethepage') +
                    ' ' +
                    bookmark.page +
                    ' ' +
                    t('of') +
                    ' ' +
                    bookmark.title}
                </Button>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Ban className="h-8 w-8" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
