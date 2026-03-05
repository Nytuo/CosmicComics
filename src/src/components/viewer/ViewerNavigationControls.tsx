import {
  ChevronLeftIcon as NavBefore,
  ChevronRightIcon as NavNext,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { PanelRect } from '@/API/TauriAPI';

interface ViewerNavigationControlsProps {
  opacityForNavigation: string;
  setOpacityForNavigation: (v: string) => void;
  currentPage: number;
  totalPages: number;
  smartPanelMode: boolean;
  panels: PanelRect[];
  currentPanelIndex: number;
  onSkipBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipEnd: () => void;
}

export default function ViewerNavigationControls({
  opacityForNavigation,
  setOpacityForNavigation,
  currentPage,
  totalPages,
  smartPanelMode,
  panels,
  currentPanelIndex,
  onSkipBack,
  onPrev,
  onNext,
  onSkipEnd,
}: ViewerNavigationControlsProps) {
  const { t } = useTranslation();

  const sharedStyle = {
    backgroundColor: 'rgba(0,0,0,0.8)',
    opacity: opacityForNavigation,
    position: 'fixed' as const,
    zIndex: 5,
    transition: 'opacity 0.2s ease-in-out',
    borderRadius: '10px',
    padding: '5px',
  };

  const hoverHandlers = {
    onMouseEnter: () => setOpacityForNavigation('1'),
    onMouseLeave: () => setOpacityForNavigation('0.1'),
  };

  return (
    <>
      <p
        style={{
          color: 'white',
          position: 'fixed',
          backgroundColor: 'rgba(0,0,0,0.50)',
          textAlign: 'right',
          bottom: 0,
          right: '5px',
          zIndex: 5,
        }}
        id="pagecount"
      >
        {currentPage + 1} / {totalPages + 1}
        {smartPanelMode && panels.length > 0 && (
          <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.7 }}>
            | {t('Smart_Panel_Mode')}: {currentPanelIndex + 1}/{panels.length}
          </span>
        )}
      </p>

      <div
        style={{
          ...sharedStyle,
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        {...hoverHandlers}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 ml-2"
              onClick={onSkipBack}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('go_start')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={onPrev}
            >
              <NavBefore className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {smartPanelMode ? t('smart_panel_prev') : t('go_previous')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={onNext}
            >
              <NavNext className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {smartPanelMode ? t('smart_panel_next') : t('go_next')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={onSkipEnd}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('go_end')}</TooltipContent>
        </Tooltip>
      </div>

      <div
        style={{
          ...sharedStyle,
          bottom: '50%',
          right: '0px',
          transform: 'translateX(-50%)',
        }}
        {...hoverHandlers}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 mr-1"
              onClick={onNext}
            >
              <NavNext className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {smartPanelMode ? t('smart_panel_next') : t('go_next')}
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        style={{
          ...sharedStyle,
          bottom: '50%',
          left: '60px',
          transform: 'translateX(-50%)',
        }}
        {...hoverHandlers}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 mr-1"
              onClick={onPrev}
            >
              <NavBefore className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {smartPanelMode ? t('smart_panel_prev') : t('go_previous')}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
