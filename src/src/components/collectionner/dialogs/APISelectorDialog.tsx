// noinspection AllyJsxHardcodedStringInspection

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import DatabaseEditorSkeleton from './DatabaseEditorSkeleton.tsx';
import RematchSkeleton from './RematchSkeleton.tsx';
import { ToasterHandler } from '../../common/ToasterHandler.tsx';
import { getAllProviders, getProvider } from '@/API/providers';
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

export default function APISelectorDialog({
  onClose,
  openModal,
}: {
  onClose: any;
  openModal: boolean;
}) {
  const { t } = useTranslation();
  const [provider, setProvider] = React.useState<number | null>(null);
  const [send, setSend] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const sendRef = React.useRef(false);

  const isManualProvider = React.useMemo(() => {
    if (provider === null) return false;
    const providerImpl = getProvider(provider);
    return providerImpl?.useDatabaseEditor ?? false;
  }, [provider]);

  const handleClose = (sended: boolean) => {
    if (!sended) {
      ToasterHandler(t('operation-aborted'), 'info');
    } else {
      ToasterHandler(t('making-changes-on-the-database'), 'info');
    }
    setSend(false);
    sendRef.current = false;
    setIsSending(false);
    setProvider(null);
    onClose();
  };

  const handleSend = async () => {
    setIsSending(true);
    setSend(true);
    sendRef.current = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!sendRef.current) {
          resolve();
          return;
        }
        setTimeout(check, 200);
      };
      setTimeout(() => resolve(), 5000);
      check();
    });
    handleClose(true);
  };

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose(false);
      }}
    >
      <DialogContent fullScreen>
        <DialogHeader>
          <DialogTitle>{t('APISelectorTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('selectAProvider')}</Label>
            <Select
              value={provider?.toString() ?? ''}
              onValueChange={(value) => {
                const numValue = parseInt(value);
                setProvider(numValue);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAProvider')} />
              </SelectTrigger>
              <SelectContent>
                {getAllProviders().map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider !== null
            ? (() => {
                const providerImpl = getProvider(provider);
                if (!providerImpl) return <p>{t('error')}</p>;
                if (providerImpl.useDatabaseEditor) {
                  return (
                    <DatabaseEditorSkeleton
                      TheBook={null}
                      type={'book'}
                      providerId={provider}
                      triggerSend={send}
                      trackedMode={true}
                    />
                  );
                }
                return (
                  <RematchSkeleton
                    provider={provider}
                    type={'book'}
                    oldID={'__new__'}
                    isNewBookMode={true}
                    onSuccess={() => handleClose(true)}
                  />
                );
              })()
            : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('cancel')}
          </Button>
          {isManualProvider && (
            <Button disabled={isSending} onClick={handleSend}>
              {isSending ? t('loading') + '...' : t('send')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
