import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import * as JellyfinAPI from '@/API/JellyfinAPI';

const QUICK_CONNECT_POLL_MS = 3000;
const QUICK_CONNECT_TIMEOUT_MS = 5 * 60 * 1000;

interface Props {
  open: boolean;
  onClose: () => void;
  onSignedIn: (server: JellyfinAPI.JellyfinServerInfo) => void;
  prefillUrl?: string;
}

export default function JellyfinServerDialog({
  open,
  onClose,
  onSignedIn,
  prefillUrl,
}: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [insecure, setInsecure] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [quick, setQuick] = React.useState<{
    code: string;
    secret: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setUrl(prefillUrl ?? '');
      setPassword('');
      setError(null);
      setQuick(null);
    }
  }, [open, prefillUrl]);

  React.useEffect(() => {
    if (!open || !quick) return;
    let cancelled = false;
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - startedAt > QUICK_CONNECT_TIMEOUT_MS) {
        setQuick(null);
        setError(t('jellyfin_quick_connect_expired'));
        return;
      }
      try {
        const server = await JellyfinAPI.quickConnectPoll(
          url,
          quick.secret,
          insecure
        );
        if (server && !cancelled) {
          cancelled = true;
          onSignedIn(server);
        }
      } catch (e) {
        if (!cancelled) {
          cancelled = true;
          setQuick(null);
          setError(String(e));
        }
      }
    }, QUICK_CONNECT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, quick, url, insecure, onSignedIn, t]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await JellyfinAPI.login(url, username, password, insecure));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startQuickConnect() {
    setBusy(true);
    setError(null);
    try {
      setQuick(await JellyfinAPI.quickConnectStart(url, insecure));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const addressField = (
    <div className="space-y-2">
      <Label htmlFor="jf-url">{t('jellyfin_server_address')}</Label>
      <Input
        id="jf-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://jellyfin.example.com"
        autoCapitalize="none"
        autoCorrect="off"
        inputMode="url"
        required
      />
      <p className="text-xs text-muted-foreground">
        {t('jellyfin_server_address_hint')}
      </p>
    </div>
  );

  const insecureField = (
    <div className="flex items-center gap-2">
      <Checkbox
        id="jf-insecure"
        checked={insecure}
        onCheckedChange={(v) => setInsecure(v === true)}
      />
      <Label htmlFor="jf-insecure" className="text-sm font-normal">
        {t('jellyfin_allow_insecure')}
      </Label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('jellyfin_add_server')}</DialogTitle>
          <DialogDescription>{t('jellyfin_add_server_desc')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="password" onValueChange={() => setQuick(null)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">{t('jellyfin_password')}</TabsTrigger>
            <TabsTrigger value="quick">
              {t('jellyfin_quick_connect')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form onSubmit={signIn} className="space-y-4 pt-2">
              {addressField}
              <div className="space-y-2">
                <Label htmlFor="jf-user">{t('jellyfin_username')}</Label>
                <Input
                  id="jf-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jf-pass">{t('jellyfin_password')}</Label>
                <Input
                  id="jf-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {insecureField}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={busy || !url || !username}>
                  {busy && <Spinner className="mr-2" />}
                  {t('jellyfin_sign_in')}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="quick">
            <div className="space-y-4 pt-2">
              {addressField}
              {insecureField}
              {quick ? (
                <div className="space-y-3 rounded-md border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('jellyfin_quick_connect_instructions')}
                  </p>
                  <p className="font-mono text-3xl tracking-[0.4em]">
                    {quick.code}
                  </p>
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner /> {t('jellyfin_quick_connect_waiting')}
                  </p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  disabled={busy || !url}
                  onClick={startQuickConnect}
                >
                  {busy && <Spinner className="mr-2" />}
                  {t('jellyfin_quick_connect_start')}
                </Button>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel')}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
