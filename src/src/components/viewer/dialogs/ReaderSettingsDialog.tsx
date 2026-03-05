/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BookOpen, Check, X, Heart, HeartOff, Palette } from 'lucide-react';
import { ToasterHandler } from '../../common/ToasterHandler.tsx';
import * as TauriAPI from '@/API/TauriAPI';
import { modifyConfigJson } from '@/utils/Fetchers.ts';
import { IUserSettings } from '@/interfaces/IUserSettings.ts';
import { JSX } from 'react';

/**
 * A dialog component for creating a new account (used in the login screen for first setup).
 * @param onClose - A function to close the dialog.
 * @param openModal - A boolean value to determine if the dialog is open or not.
 * @param Reader - The function to change the page.
 * @param LOI - The list of images.
 * @param currentPage - The current page.
 * @param setCurrentPage - The function to change the current page.
 * @param setDoublePageMode - The function to change the double page mode.
 * @param setBlankFirstPage - The function to change the blank first page.
 * @param setDPMNoH - The function to change the no double page for horizontal.
 * @param setActionbarON - The function to change the actionbar.
 * @param actionbarON - The actionbar.
 * @param setSlideShow - The function to change the slideshow.
 * @param setSlideShowInterval - The function to change the slideshow interval.
 * @param slideShowInterval - The slideshow interval.
 * @param setMangaMode - The function to change the manga mode.
 * @param VIV_On - The vertical reader mode.
 * @param setVIVOn - The function to change the vertical reader mode.
 * @param setWebToonMode - The function to change the webtoon mode.
 * @param fixWidth - The function to fix the width.
 * @param fixHeight - The function to fix the height.
 * @param setBackgroundColorAuto - The function to change the background color.
 * @param backgroundColorAuto - The background color.
 * @param userSettings - The user settings.
 * @param smartPanelMode - The smart panel mode.
 * @param setSmartPanelMode - The function to change the smart panel mode.
 * @returns {JSX.Element} - A dialog component for creating a new account.
 */
export default function ReaderSettingsDialog({
  onClose,
  openModal,
  Reader,
  LOI,
  currentPage,
  setCurrentPage,
  setDoublePageMode,
  setBlankFirstPage,
  setDPMNoH,
  setActionbarON,
  actionbarON,
  setSlideShow,
  setSlideShowInterval,
  slideShowInterval,
  setMangaMode,
  VIV_On,
  setVIVOn,
  setWebToonMode,
  fixWidth,
  fixHeight,
  setBackgroundColorAuto,
  backgroundColorAuto,
  userSettings,
  smartPanelMode,
  setSmartPanelMode,
  showPanelDebugOverlay,
  setShowPanelDebugOverlay,
}: {
  onClose: any;
  openModal: boolean;
  Reader: any;
  LOI: any;
  currentPage: number;
  setCurrentPage: any;
  setDoublePageMode: any;
  setBlankFirstPage: any;
  setDPMNoH: any;
  setActionbarON: any;
  actionbarON: boolean;
  slideShow: boolean;
  setSlideShow: any;
  setSlideShowInterval: any;
  slideShowInterval: number;
  mangaMode: boolean;
  setMangaMode: any;
  VIV_On: boolean;
  setVIVOn: any;
  setWebToonMode: any;
  fixWidth: any;
  fixHeight: any;
  setBackgroundColorAuto: any;
  backgroundColorAuto: boolean;
  userSettings: IUserSettings;
  smartPanelMode: boolean;
  setSmartPanelMode: any;
  showPanelDebugOverlay: boolean;
  setShowPanelDebugOverlay: (v: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
  };

  const [state, setState] = React.useState([
    { Double_Page_Mode: false },
    { Blank_page_At_Begginning: false },
    { No_Double_Page_For_Horizontal: false },
    { Manga_Mode: false },
    { SlideShow: false },
    { NoBar: false },
    { Page_Counter: true },
    { Vertical_Reader_Mode: false },
    { webToonMode: false },
    { Scroll_bar_visible: true },
    { Smart_Panel_Mode: false },
  ]);

  React.useEffect(() => {
    setColor(userSettings.Background_color);
    document.body.style.background = userSettings.Background_color;
    setBackgroundColorAuto(userSettings.Automatic_Background_Color);
    setSlideShow(userSettings.SlideShow);
    setSlideShowInterval(userSettings.SlideShow_Time);
    setMangaMode(userSettings.Manga_Mode);
    setVIVOn(userSettings.Vertical_Reader_Mode);
    setWebToonMode(userSettings.webToonMode);
    if (userSettings.webToonMode) {
      setVIVOn(true);
      fixWidth();
      state[7] = { Vertical_Reader_Mode: true };
    }
    setSmartPanelMode(userSettings.Smart_Panel_Mode);
    setActionbarON(!userSettings.NoBar);
    setDoublePageMode(userSettings.Double_Page_Mode);
    setDoublePage(userSettings.Double_Page_Mode);
    setBlankFirstPage(userSettings.Blank_page_At_Begginning);
    setDPMNoH(userSettings.No_Double_Page_For_Horizontal);
    if (!userSettings.Scroll_bar_visible) {
      const styleSheet = document.styleSheets[1];
      styleSheet.insertRule('::-webkit-scrollbar {display: none;}', 0);
    }
    if (userSettings.Page_Counter) {
      const pagecount = document.getElementById('pagecount');
      if (pagecount) {
        pagecount.style.display = 'block';
      }
    }
    for (const usersetting in userSettings) {
      for (let i = 0; state.length > i; i++) {
        const itemKey = Object.keys(state[i])[0];
        if (itemKey === usersetting) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          state[i] = { [itemKey]: userSettings[usersetting] };
        }
      }
    }
  }, [userSettings]);

  const [doublePage, setDoublePage] = React.useState(false);
  React.useEffect(() => {
    state[5] = { NoBar: !actionbarON };
  }, [actionbarON, state]);

  React.useEffect(() => {
    if (!doublePage) {
      state[2] = { No_Double_Page_For_Horizontal: false };
      state[1] = { Blank_page_At_Begginning: false };
    }
  }, [doublePage, state]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(event.target.name);

    const pagecount = document.getElementById('pagecount');
    const styleSheet = document.styleSheets[1];
    switch (event.target.name) {
      case 'Page_Counter':
        if (!pagecount) break;
        if (event.target.checked) {
          pagecount.style.display = 'block';
        } else {
          pagecount.style.display = 'none';
        }
        break;
      case 'Scroll_bar_visible':
        if (event.target.checked) {
          styleSheet.deleteRule(0);
        } else {
          styleSheet.insertRule('::-webkit-scrollbar {display: none;}', 0);
        }
        break;
      case 'Double_Page_Mode':
        if (event.target.checked) {
          setDoublePageMode(true);
          setDoublePage(true);
          try {
            modifyConfigJson('Double_Page_Mode', 'true');
          } catch (e) {
            console.log(e);
          }
        } else {
          setDoublePageMode(false);
          setDoublePage(false);
          try {
            modifyConfigJson('Double_Page_Mode', 'false');
          } catch (e) {
            console.log(e);
          }
          setBlankFirstPage(false);
          setDPMNoH(false);
        }
        break;
      case 'Blank_page_At_Begginning':
        if (event.target.checked) {
          setBlankFirstPage(true);
          try {
            modifyConfigJson('Blank_page_At_Begginning', 'true');
          } catch (e) {
            console.log(e);
          }
        } else {
          setBlankFirstPage(false);
          try {
            modifyConfigJson('Blank_page_At_Begginning', 'false');
          } catch (e) {
            console.log(e);
          }
        }
        break;
      case 'no_dpm_horizontal':
        if (event.target.checked) {
          setDPMNoH(true);
          try {
            modifyConfigJson('No_Double_Page_For_Horizontal', 'true');
          } catch (e) {
            console.log(e);
          }
        } else {
          setDPMNoH(false);
          try {
            modifyConfigJson('No_Double_Page_For_Horizontal', 'false');
          } catch (e) {
            console.log(e);
          }
        }
        break;
      case 'NoBar':
        if (event.target.checked) {
          setActionbarON(false);
        } else {
          setActionbarON(true);
        }
        break;
      case 'SlideShow':
        if (event.target.checked) {
          setSlideShow(true);
        } else {
          setSlideShow(false);
        }
        break;
      case 'Manga_Mode':
        if (event.target.checked) {
          setMangaMode(true);
          modifyConfigJson('Manga_Mode', 'true');
        } else {
          setMangaMode(false);
          modifyConfigJson('Manga_Mode', 'false');
        }
        break;
      case 'Vertical_Reader_Mode':
        if (event.target.checked) {
          setVIVOn(true);
          modifyConfigJson('Vertical_Reader_Mode', 'true');
        } else {
          setVIVOn(false);
          modifyConfigJson('Vertical_Reader_Mode', 'false');
        }
        break;
      case 'webToonMode':
        if (event.target.checked) {
          modifyConfigJson('WebToonMode', 'true');
          setVIVOn(true);
          setWebToonMode(true);
          fixWidth();
          state[7] = { Vertical_Reader_Mode: true };
        } else {
          modifyConfigJson('WebToonMode', 'false');
          setVIVOn(false);
          setWebToonMode(false);
          fixHeight();
          state[7] = { Vertical_Reader_Mode: false };
        }
        break;
      case 'Smart_Panel_Mode':
        if (event.target.checked) {
          setSmartPanelMode(true);
          modifyConfigJson('Smart_Panel_Mode', 'true');
        } else {
          setSmartPanelMode(false);
          modifyConfigJson('Smart_Panel_Mode', 'false');
        }
        break;
      default:
        break;
    }

    setState((prevState) => {
      return prevState.map((item: any) => {
        const itemKey = Object.keys(item)[0];
        if (itemKey === event.target.name) {
          const itemValue = item[itemKey];
          return { [itemKey]: !itemValue };
        }
        return item;
      });
    });
  };

  const [value, setValue] = React.useState(currentPage + 1);

  const [color, setColor] = React.useState('rgba(0,0,0,0)');

  function rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#000000';
    const r = parseInt(match[0]).toString(16).padStart(2, '0');
    const g = parseInt(match[1]).toString(16).padStart(2, '0');
    const b = parseInt(match[2]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  const handleSliderChange = (newValue: number) => {
    setValue(newValue);
    setCurrentPage(newValue);
    Reader(LOI, newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value === '' ? 0 : Number(event.target.value));
    setCurrentPage(event.target.value === '' ? 0 : Number(event.target.value));
    Reader(LOI, event.target.value === '' ? 0 : Number(event.target.value));
  };

  const handleBlur = () => {
    if (value < 0) {
      setValue(0);
    } else if (value > LOI.length) {
      setValue(LOI.length);
    }
  };

  const [isFavorite, setIsFavorite] = React.useState(false);

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-2xl h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('book_settings')}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  ToasterHandler(t('marked_as_read'), 'success');
                  const books = await TauriAPI.getBooksByPath(
                    localStorage.getItem('currentBook') ?? ''
                  );
                  if (books.length > 0) {
                    await TauriAPI.updateBookStatusOne('read', books[0].id);
                  }
                }}
              >
                <Check className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('mkread')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                id="readingbtndetails"
                onClick={async () => {
                  ToasterHandler(t('marked_as_reading'), 'success');
                  const books = await TauriAPI.getBooksByPath(
                    localStorage.getItem('currentBook') ?? ''
                  );
                  if (books.length > 0) {
                    await TauriAPI.updateBookStatusOne('reading', books[0].id);
                  }
                }}
              >
                <BookOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('mkreading')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                id="decheckbtn"
                onClick={async () => {
                  ToasterHandler(t('marked_as_unread'), 'success');
                  const books = await TauriAPI.getBooksByPath(
                    localStorage.getItem('currentBook') ?? ''
                  );
                  if (books.length > 0) {
                    await TauriAPI.updateBookStatusOne('unread', books[0].id);
                  }
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('mkunread')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                id="favoritebtn"
                onClick={async () => {
                  const books = await TauriAPI.getBooksByPath(
                    localStorage.getItem('currentBook') ?? ''
                  );
                  if (books.length > 0) {
                    const nowFav = await TauriAPI.toggleFavorite(
                      'book',
                      books[0].id
                    );
                    setIsFavorite(nowFav);
                    ToasterHandler(
                      nowFav ? t('add_fav') : t('remove_fav'),
                      'success'
                    );
                  }
                }}
              >
                {isFavorite ? (
                  <Heart className="h-5 w-5 fill-current" />
                ) : (
                  <HeartOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toogle_fav')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                id="autobgbtn"
                onClick={() => {
                  if (backgroundColorAuto) {
                    setBackgroundColorAuto(false);
                    modifyConfigJson('Automatic_Background_Color', 'false');
                  } else {
                    setBackgroundColorAuto(true);
                    modifyConfigJson('Automatic_Background_Color', 'true');
                  }
                }}
              >
                <Palette className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('auto_bg_color')}</TooltipContent>
          </Tooltip>
        </div>
        <div className="w-full space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('readerSettings')}
          </h3>
          <div className="space-y-3">
            {state.map((item: any, index: number) => {
              const itemKey = Object.keys(item)[0];
              const itemValue = item[itemKey];
              return (
                <div key={index} className="flex items-center justify-between">
                  <Label htmlFor={`id_${itemKey}`}>{t(itemKey)}</Label>
                  <Switch
                    id={`id_${itemKey}`}
                    checked={itemValue}
                    disabled={
                      (!doublePage &&
                        (itemKey === 'Blank_page_At_Begginning' ||
                          itemKey === 'no_dpm_horizontal')) ||
                      (VIV_On &&
                        (itemKey === 'Double_Page_Mode' ||
                          itemKey === 'Blank_page_At_Begginning' ||
                          itemKey === 'no_dpm_horizontal')) ||
                      (smartPanelMode &&
                        (itemKey === 'Double_Page_Mode' ||
                          itemKey === 'Blank_page_At_Begginning' ||
                          itemKey === 'no_dpm_horizontal' ||
                          itemKey === 'Vertical_Reader_Mode' ||
                          itemKey === 'webToonMode'))
                    }
                    onCheckedChange={(checked) => {
                      handleChange({
                        target: { name: itemKey, checked },
                      } as React.ChangeEvent<HTMLInputElement>);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {smartPanelMode && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('smartPanelDebug')}
              </h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="id_showPanelDebugOverlay">
                  {t('showPanelDebugOverlay')}
                </Label>
                <Switch
                  id="id_showPanelDebugOverlay"
                  checked={showPanelDebugOverlay}
                  onCheckedChange={(checked) =>
                    setShowPanelDebugOverlay(checked)
                  }
                />
              </div>
            </>
          )}

          <h3 className="text-sm font-medium text-muted-foreground">
            {t('slideshowIntervalTime')}
          </h3>

          <Slider
            defaultValue={[userSettings.SlideShow_Time | 1]}
            value={[slideShowInterval / 1000]}
            step={1}
            onValueChange={(val) => {
              setSlideShowInterval(val[0] * 1000);
            }}
            min={1}
            max={60}
          />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('pageSlider')}
          </h3>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Slider
                value={[value]}
                onValueChange={(val) => handleSliderChange(val[0])}
                max={LOI.length}
                step={1}
                min={1}
              />
            </div>
            <Input
              className="w-20"
              type="number"
              value={value}
              onChange={handleInputChange}
              onBlur={handleBlur}
              min={1}
              max={LOI.length}
              step={1}
            />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('backgroundColor')}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                color.startsWith('rgba') || color.startsWith('rgb')
                  ? rgbToHex(color)
                  : color
              }
              onChange={(e) => {
                setColor(e.target.value);
                document.body.style.background = e.target.value;
                modifyConfigJson('Background_color', e.target.value);
              }}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                document.body.style.background = e.target.value;
                modifyConfigJson('Background_color', e.target.value);
              }}
              className="flex-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>{t('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
