import * as React from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { setTheme } from '@/utils/Common.ts';
import { cn } from '@/lib/utils';
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import {
  getCredentialDefinitions,
  getApiCredentials,
  saveApiCredentials,
  type CredentialDefinition,
} from '@/API/TauriAPI.ts';

interface ThemeOption {
  id: string;
  label: string;
  colors: { bg: string; primary: string; accent: string };
}

const themes: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    colors: { bg: '#0a0a0a', primary: '#ffffff', accent: '#464ce8' },
  },
  {
    id: 'light',
    label: 'Light',
    colors: { bg: '#ffffff', primary: '#cccdce', accent: '#464ce8' },
  },
  {
    id: 'OLED',
    label: 'OLED',
    colors: { bg: '#000000', primary: '#ffffff', accent: '#464ce8' },
  },
  {
    id: 'blue',
    label: 'Blue',
    colors: { bg: '#0a1628', primary: '#90caf9', accent: '#1565c0' },
  },
  {
    id: 'red',
    label: 'Red',
    colors: { bg: '#1a0a0a', primary: '#ef5350', accent: '#b71c1c' },
  },
  {
    id: 'green',
    label: 'Green',
    colors: { bg: '#0a1a0a', primary: '#66bb6a', accent: '#2e7d32' },
  },
  {
    id: 'sith',
    label: 'Sith',
    colors: { bg: '#0a0000', primary: '#ff1744', accent: '#d50000' },
  },
  {
    id: 'jedi',
    label: 'Jedi',
    colors: { bg: '#0a0f1a', primary: '#29b6f6', accent: '#0288d1' },
  },
  {
    id: 'halloween',
    label: 'Halloween',
    colors: { bg: '#1a0f00', primary: '#ff9800', accent: '#e65100' },
  },
  {
    id: 'xmas',
    label: 'Christmas',
    colors: { bg: '#0a1a0a', primary: '#c62828', accent: '#1b5e20' },
  },
];

export default function SettingsDialog({
  onClose,
  openModal,
}: {
  onClose: any;
  openModal: boolean;
}) {
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState<string>(
    localStorage.getItem('language') ?? 'en'
  );
  const [currentTheme, setCurrentTheme] = React.useState<string>(
    localStorage.getItem('theme') ?? 'dark'
  );

  const [credDefs, setCredDefs] = React.useState<CredentialDefinition[]>([]);
  const [credValues, setCredValues] = React.useState<Record<string, string>>(
    {}
  );
  const [revealedFields, setRevealedFields] = React.useState<
    Record<string, boolean>
  >({});
  const [isSavingCreds, setIsSavingCreds] = React.useState(false);
  const [credSaveStatus, setCredSaveStatus] = React.useState<
    'idle' | 'success' | 'error'
  >('idle');

  React.useEffect(() => {
    if (!openModal) return;
    getCredentialDefinitions().then(setCredDefs).catch(console.error);
    getApiCredentials().then(setCredValues).catch(console.error);
  }, [openModal]);

  const handleCredChange = (key: string, value: string) => {
    setCredValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleReveal = (key: string) => {
    setRevealedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveCredentials = async () => {
    setIsSavingCreds(true);
    setCredSaveStatus('idle');
    try {
      await saveApiCredentials(credValues);
      setCredSaveStatus('success');
      setTimeout(() => setCredSaveStatus('idle'), 2500);
    } catch (e) {
      console.error('Failed to save credentials:', e);
      setCredSaveStatus('error');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const credsByProvider = React.useMemo(() => {
    const groups: Record<string, CredentialDefinition[]> = {};
    for (const def of credDefs) {
      if (!groups[def.provider]) groups[def.provider] = [];
      groups[def.provider].push(def);
    }
    return groups;
  }, [credDefs]);

  const resolveLanguageNameByCode = (code: string) => {
    switch (code) {
      case 'fr':
        return 'Français';
      case 'en':
        return 'English';
      case 'es':
        return 'Español';
      case 'it':
        return 'Italiano';
      case 'de':
        return 'Deutsch';
      case 'dev':
        return 'Dev';
      default:
        return code;
    }
  };

  const locales = ['en', 'fr', 'es', 'it', 'de', 'dev'];

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:w-160 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-4">
          <div className="space-y-3">
            <Label>{t('select_a_theme')}</Label>
            <div className="grid grid-cols-5 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setCurrentTheme(theme.id);
                    setTheme(theme.id);
                  }}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors hover:border-ring',
                    currentTheme === theme.id
                      ? 'border-ring'
                      : 'border-transparent'
                  )}
                >
                  <div
                    className="relative flex h-10 w-full items-center justify-center rounded-md"
                    style={{ backgroundColor: theme.colors.bg }}
                  >
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                    {currentTheme === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check
                          className="h-4 w-4"
                          style={{ color: theme.colors.primary }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('select_a_language')}</Label>
            <Select
              value={language}
              onValueChange={async (value) => {
                setLanguage(value);
                await i18next.changeLanguage(value);
                localStorage.setItem('language', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('select_a_language')} />
              </SelectTrigger>
              <SelectContent>
                {locales.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {resolveLanguageNameByCode(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {credDefs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base">{t('api_credentials')}</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {t('api_credentials_description', 'api-insert-text')}
              </p>

              {Object.entries(credsByProvider).map(([provider, defs]) => (
                <div key={provider} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {provider}
                  </p>
                  {defs.map((def) => (
                    <div key={def.key} className="space-y-1">
                      <Label
                        htmlFor={`cred-${def.key}`}
                        className="text-xs text-muted-foreground"
                      >
                        {def.label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`cred-${def.key}`}
                          type={
                            def.is_secret && !revealedFields[def.key]
                              ? 'password'
                              : 'text'
                          }
                          placeholder={def.description}
                          value={credValues[def.key] ?? ''}
                          onChange={(e) =>
                            handleCredChange(def.key, e.target.value)
                          }
                          className={cn(
                            'pr-10 font-mono text-sm',
                            def.is_secret && 'tracking-widest'
                          )}
                        />
                        {def.is_secret && (
                          <button
                            type="button"
                            onClick={() => handleToggleReveal(def.key)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={
                              revealedFields[def.key] ? t('hide') : t('show')
                            }
                          >
                            {revealedFields[def.key] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSavingCreds}
                  className="gap-2"
                >
                  {isSavingCreds && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {t('save_credentials')}
                </Button>
                {credSaveStatus === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <Check className="h-4 w-4" />
                    {t('saved')}
                  </span>
                )}
                {credSaveStatus === 'error' && (
                  <span className="text-sm text-destructive">
                    {t('save_failed')}
                  </span>
                )}
              </div>
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
