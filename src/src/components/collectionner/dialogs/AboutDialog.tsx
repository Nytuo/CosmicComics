import * as React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import Logger from '@/logger.ts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function AboutDialog({
  onClose,
  openModal,
}: {
  onClose: any;
  openModal: boolean;
}) {
  const [version, setVersion] = React.useState('');
  const { t } = useTranslation();

  useEffect(() => {
    TauriAPI.getAppVersion()
      .then(function (data: any) {
        const versionStr =
          typeof data === 'string' ? data.replaceAll('"', '') : String(data);
        setVersion(t('version') + ' ' + versionStr);
        Logger.info('Version: ' + versionStr);
      })
      .catch(function (error) {
        Logger.error(error);
      });
  }, [t]);

  const listOfBetaTesters = ['Théo LEPRINCE', 'Arnaud BEUX'];

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-150">
        <DialogHeader>
          <DialogTitle>{t('about')}</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3 py-4">
          <h1 className="text-2xl font-bold text-center">Cosmic Comics</h1>
          <div className="flex items-center justify-center gap-2">
            <img
              src="Images/Logo.png"
              alt=""
              className="navbar-brand rotate linear infinite h-20 w-auto"
            />
            <img
              src="Images/LogoTxt.png"
              alt=""
              className="navbar-brand h-20"
            />
          </div>
          <p>{version}</p>
          <p>{t('createdby')}</p>
          <p>{t('technology_used')}</p>
          <p dangerouslySetInnerHTML={{ __html: t('github_promoted') }}></p>
          <p dangerouslySetInnerHTML={{ __html: t('license') }}></p>
          <p>{t('translation')}</p>
          <p>
            {t('betatest')}
            {listOfBetaTesters.map((betaTester, index) => (
              <span key={index}>
                {betaTester}
                {index < listOfBetaTesters.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="https://nytuo.fr" target="_blank">
              <img src="Images/Nytuo_softwares.png" alt="" className="h-20" />
            </a>
            <a href="https://nytuo.fr" target="_blank">
              <img src="Images/Nytuo website.png" className="h-20" alt="Logo" />
            </a>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('back')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
