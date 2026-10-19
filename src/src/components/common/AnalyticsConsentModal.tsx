import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  type AnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '@/utils/analytics.ts';

export default function AnalyticsConsentModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState(false);
  const [errors, setErrors] = useState(false);

  useEffect(() => {
    getAnalyticsConsent().then((consent) => {
      if (consent === null) setOpen(true);
    });
  }, []);

  const answer = async (consent: AnalyticsConsent) => {
    setOpen(false);
    await setAnalyticsConsent(consent).catch(console.error);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('analytics_title')}
          </DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">{t('analytics_intro')}</span>
            <span className="block">{t('analytics_never')}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="consent-usage">{t('analytics_usage')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('analytics_usage_description')}
              </p>
            </div>
            <Switch
              id="consent-usage"
              checked={usage}
              onCheckedChange={setUsage}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="consent-errors">{t('analytics_errors')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('analytics_errors_description')}
              </p>
            </div>
            <Switch
              id="consent-errors"
              checked={errors}
              onCheckedChange={setErrors}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => answer({ usage: false, errors: false })}
          >
            {t('analytics_decline')}
          </Button>
          <Button onClick={() => answer({ usage, errors })}>
            {t('analytics_confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
