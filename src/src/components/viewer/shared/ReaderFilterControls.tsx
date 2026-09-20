import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Label } from '@/components/ui/label.tsx';
import type { ReaderPrefs } from './readerPrefs.ts';

type Update = (patch: Partial<ReaderPrefs>) => void;

function SliderRow({
  label,
  value,
  min,
  max,
  suffix = '%',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="flex-col items-start gap-0.5">
        <span className="text-sm">{label}</span>
        {hint && (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Brightness / contrast / night-light / grayscale / invert / crop controls
 * shared by the desktop settings dialog and the mobile settings sheet.
 */
export default function ReaderFilterControls({
  prefs,
  update,
  showCrop = true,
}: {
  prefs: ReaderPrefs;
  update: Update;
  showCrop?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <SliderRow
        label={t('reader_brightness')}
        value={prefs.brightness}
        min={40}
        max={140}
        onChange={(brightness) => update({ brightness })}
      />
      <SliderRow
        label={t('reader_contrast')}
        value={prefs.contrast}
        min={60}
        max={160}
        onChange={(contrast) => update({ contrast })}
      />
      <SliderRow
        label={t('reader_warmth')}
        value={prefs.warmth}
        min={0}
        max={100}
        onChange={(warmth) => update({ warmth })}
      />
      <SwitchRow
        id="reader-grayscale"
        label={t('reader_grayscale')}
        checked={prefs.grayscale}
        onChange={(grayscale) => update({ grayscale })}
      />
      <SwitchRow
        id="reader-invert"
        label={t('reader_invert')}
        hint={t('reader_invert_hint')}
        checked={prefs.invert}
        onChange={(invert) => update({ invert })}
      />
      {showCrop && (
        <SwitchRow
          id="reader-crop"
          label={t('reader_crop')}
          hint={t('reader_crop_hint')}
          checked={prefs.cropBorders}
          onChange={(cropBorders) => update({ cropBorders })}
        />
      )}
    </div>
  );
}

export { SliderRow, SwitchRow };
