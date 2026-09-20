import * as React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoveHorizontal,
  MoveVertical,
  Maximize,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import BookQuickActions from '../shared/BookQuickActions.tsx';
import ReaderFilterControls, {
  SliderRow,
  SwitchRow,
} from '../shared/ReaderFilterControls.tsx';
import {
  DEFAULT_PREFS,
  type Backdrop,
  type FitMode,
  type PageTransition,
  type ReaderPrefs,
  type ReadingMode,
} from '../shared/readerPrefs.ts';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  swatch?: string;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex gap-1 rounded-2xl bg-muted/70 p-1">
      {options.map(({ value: option, label, icon: Icon, swatch }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-medium transition-all',
            value === option
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground'
          )}
        >
          {Icon && <Icon className="size-4" />}
          {swatch && (
            <span
              className="size-4 rounded-full border border-border"
              style={{ background: swatch }}
            />
          )}
          <span className="max-w-full truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

interface MobileReaderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: ReaderPrefs;
  update: (patch: Partial<ReaderPrefs>) => void;
  reset: () => void;
  /** The series this book belongs to, when reading mode is remembered per series. */
  seriesTitle: string | null;
  /** Spreads only make sense when the screen is wide enough. */
  canSpread: boolean;
}

/** Everything adjustable while reading, in one bottom sheet. */
export default function MobileReaderSettings({
  open,
  onOpenChange,
  prefs,
  update,
  reset,
  seriesTitle,
  canSpread,
}: MobileReaderSettingsProps) {
  const { t } = useTranslation();
  const vertical = prefs.readingMode === 'vertical';

  const modes: Option<ReadingMode>[] = [
    { value: 'ltr', label: t('reader_mode_ltr'), icon: ArrowRight },
    { value: 'rtl', label: t('reader_mode_rtl'), icon: ArrowLeft },
    { value: 'vertical', label: t('reader_mode_vertical'), icon: ArrowDown },
  ];
  const fits: Option<FitMode>[] = [
    { value: 'screen', label: t('reader_fit_screen'), icon: Maximize },
    { value: 'width', label: t('reader_fit_width'), icon: MoveHorizontal },
    { value: 'height', label: t('reader_fit_height'), icon: MoveVertical },
  ];
  const transitions: Option<PageTransition>[] = [
    { value: 'slide', label: t('reader_transition_slide') },
    { value: 'fade', label: t('reader_transition_fade') },
    { value: 'none', label: t('reader_transition_none') },
  ];
  const backdrops: Option<Backdrop>[] = [
    { value: 'black', label: t('reader_backdrop_black'), swatch: '#000' },
    { value: 'dark', label: t('reader_backdrop_dark'), swatch: '#262626' },
    { value: 'white', label: t('reader_backdrop_white'), swatch: '#fff' },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[88dvh] max-h-[88dvh] rounded-t-3xl">
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="text-lg">{t('book_settings')}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t('readerSettings')}
          </DrawerDescription>
        </DrawerHeader>

        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 pt-2 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]"
        >
          <BookQuickActions />

          <Section
            title={t('reader_mode')}
            hint={
              seriesTitle
                ? t('reader_remembered', { series: seriesTitle })
                : undefined
            }
          >
            <Segmented
              value={prefs.readingMode}
              options={modes}
              onChange={(readingMode) => update({ readingMode })}
            />
            {!vertical && (
              <Segmented
                value={prefs.fit}
                options={fits}
                onChange={(fit) => update({ fit })}
              />
            )}
            {!vertical && canSpread && (
              <>
                <SwitchRow
                  id="reader-spread"
                  label={t('reader_spread')}
                  hint={t('reader_spread_hint')}
                  checked={prefs.spread}
                  onChange={(spread) => update({ spread })}
                />
                {prefs.spread && (
                  <SwitchRow
                    id="reader-cover"
                    label={t('reader_cover_alone')}
                    checked={prefs.coverAlone}
                    onChange={(coverAlone) => update({ coverAlone })}
                  />
                )}
              </>
            )}
          </Section>

          <Section title={t('reader_navigation')}>
            {!vertical && (
              <div className="space-y-2">
                <p className="text-sm">{t('reader_transition')}</p>
                <Segmented
                  value={prefs.transition}
                  options={transitions}
                  onChange={(transition) => update({ transition })}
                />
              </div>
            )}
            <SwitchRow
              id="reader-tap"
              label={t('reader_tap_zones')}
              hint={t('reader_tap_zones_hint')}
              checked={prefs.tapZones}
              onChange={(tapZones) => update({ tapZones })}
            />
            <SwitchRow
              id="reader-auto"
              label={t('reader_auto_turn')}
              hint={t(
                vertical ? 'reader_auto_scroll_hint' : 'reader_auto_turn_hint'
              )}
              checked={prefs.autoTurn > 0}
              onChange={(on) => update({ autoTurn: on ? 8 : 0 })}
            />
            {prefs.autoTurn > 0 && (
              <SliderRow
                label={t('slideshowIntervalTime')}
                value={prefs.autoTurn}
                min={2}
                max={30}
                suffix=" s"
                onChange={(autoTurn) => update({ autoTurn })}
              />
            )}
          </Section>

          <Section title={t('reader_filters')}>
            <ReaderFilterControls
              prefs={prefs}
              update={update}
              showCrop={!vertical}
            />
          </Section>

          <Section title={t('reader_comfort')}>
            <div className="space-y-2">
              <p className="text-sm">{t('reader_backdrop')}</p>
              <Segmented
                value={prefs.backdrop}
                options={backdrops}
                onChange={(backdrop) => update({ backdrop })}
              />
            </div>
            <SwitchRow
              id="reader-awake"
              label={t('reader_keep_awake')}
              checked={prefs.keepAwake}
              onChange={(keepAwake) => update({ keepAwake })}
            />
            <SwitchRow
              id="reader-page-number"
              label={t('reader_page_number')}
              checked={prefs.pageNumber}
              onChange={(pageNumber) => update({ pageNumber })}
            />
            <SwitchRow
              id="reader-haptics"
              label={t('reader_haptics')}
              checked={prefs.haptics}
              onChange={(haptics) => update({ haptics })}
            />
          </Section>

          <Button
            variant="outline"
            className="h-11 w-full rounded-full"
            onClick={() => {
              reset();
              update({
                readingMode: DEFAULT_PREFS.readingMode,
                fit: DEFAULT_PREFS.fit,
                spread: DEFAULT_PREFS.spread,
              });
            }}
          >
            {t('reader_reset')}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
