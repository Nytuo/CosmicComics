import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Bookmark,
  BookmarkCheck,
  RotateCw,
  RotateCcw,
  ScanSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { JSX } from 'react';

export default function SubMenu({
  TBM,
  bookmarked,
  rotation,
  setRotation,
  zoomLevel,
  setZoomLevel,
  isMagnifierOn,
  setIsMagnifierOn,
}: {
  TBM: () => void;
  bookmarked: boolean;
  rotation: number;
  setRotation: (rotation: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number) => void;
  isMagnifierOn: boolean;
  setIsMagnifierOn: (isMagnifierOn: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('more')}>
          <ChevronDown className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-wrap gap-1 p-2 w-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const zoom = zoomLevel + 20;
                setZoomLevel(zoom);
              }}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('zoom_in')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const zoom = zoomLevel - 20;
                setZoomLevel(zoom);
              }}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('zoom_out')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                TBM();
              }}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('Bookmark')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                let rotate = rotation + 90;
                if (rotate === 360) {
                  rotate = 0;
                }
                setRotation(rotate);
              }}
            >
              <RotateCw className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('rotate_right')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                let rotate = rotation - 90;
                if (rotate === -90) {
                  rotate = 270;
                }
                setRotation(rotate);
              }}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('rotate_left')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsMagnifierOn(!isMagnifierOn);
              }}
            >
              <ScanSearch className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('magnifier_toggle')}</TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
