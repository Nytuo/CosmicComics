import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  BookMarked,
  Maximize,
  Menu,
  Minimize,
  Move,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import SubMenu from './SubMenu.tsx';

interface ViewerHeaderProps {
  open: boolean;
  isFullscreen: boolean;
  onDrawerOpen: () => void;
  onGoBack: () => void;
  onFixWidth: () => void;
  onFixHeight: () => void;
  onRecenter: () => void;
  onToggleFullscreen: () => void;
  onOpenBookSettings: () => void;
  TBM: () => void;
  bookmarked: boolean;
  rotation: number;
  setRotation: (r: number) => void;
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  isMagnifierOn: boolean;
  setIsMagnifierOn: (v: boolean) => void;
}

export default function ViewerHeader({
  open,
  isFullscreen,
  onDrawerOpen,
  onGoBack,
  onFixWidth,
  onFixHeight,
  onRecenter,
  onToggleFullscreen,
  onOpenBookSettings,
  TBM,
  bookmarked,
  rotation,
  setRotation,
  zoomLevel,
  setZoomLevel,
  isMagnifierOn,
  setIsMagnifierOn,
}: ViewerHeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className={`fixed top-0 z-50 flex items-center h-16 border-b border-border bg-background/80 backdrop-blur transition-all duration-200 ${
        open ? 'ml-60 w-[calc(100%-240px)]' : 'ml-0 w-full'
      }`}
    >
      <div className="flex items-center w-full px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`mr-2 ${open ? 'hidden' : ''}`}
              aria-label={t('openDrawer')}
              onClick={onDrawerOpen}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('openDrawer')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={onGoBack}
            >
              <BookMarked className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('go_back')}</TooltipContent>
        </Tooltip>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%, 0)',
            width: 'auto',
            height: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={onFixWidth}
              >
                <AlignHorizontalJustifyCenter className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('fix_width')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={onFixHeight}
              >
                <AlignVerticalJustifyCenter className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('fix_height')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={onRecenter}
              >
                <Move className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('recenter')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('full_screen')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={onOpenBookSettings}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('book_settings')}</TooltipContent>
          </Tooltip>

          <SubMenu
            TBM={TBM}
            bookmarked={bookmarked}
            rotation={rotation}
            setRotation={setRotation}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            isMagnifierOn={isMagnifierOn}
            setIsMagnifierOn={setIsMagnifierOn}
          />
        </div>
      </div>
    </header>
  );
}
