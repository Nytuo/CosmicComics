import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { tryToParse } from '@/utils/utils.ts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function MoreInfoDialog({
  onClose,
  openModal,
  desc,
  name,
  hrefURL,
  image,
  type,
}: {
  onClose: any;
  openModal: boolean;
  desc?: string;
  name?: string;
  hrefURL?: string;
  image?: string;
  type?: 'avatar' | 'cover';
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:w-150 w-lg">
        <DialogHeader>
          <DialogTitle>{t('seeMore')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {type === 'cover' ? (
            <img src={image} alt={name} className="mx-auto block h-120" />
          ) : (
            <Avatar className="mx-auto h-25 w-25">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback>{name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
          )}
          <h3 className="text-xl font-semibold text-center">{name}</h3>
          <ReactMarkdown
            children={
              desc === null || desc === undefined ? '' : tryToParse(desc)
            }
            rehypePlugins={[rehypeRaw]}
          />
          <a
            target="_blank"
            href={hrefURL}
            className="text-primary hover:underline cursor-pointer"
            id="moreinfo_btn"
          >
            {t('seeMore')}
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
