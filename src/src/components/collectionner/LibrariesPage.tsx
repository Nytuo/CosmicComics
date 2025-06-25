import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import { ToasterHandler } from '../common/ToasterHandler.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface ScanPath {
  id: string;
  name: string;
  path: string;
}

export default function LibrariesPage() {
  const { t } = useTranslation();
  const [scanPaths, setScanPaths] = React.useState<ScanPath[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formPath, setFormPath] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);

  const handleScanAll = async () => {
    setIsScanning(true);
    try {
      const result = (await TauriAPI.scanAllLibraries()) as any;
      ToasterHandler(
        t('scanCompleted') +
          ': ' +
          (result?.total_series ?? 0) +
          ' ' +
          t('series'),
        'success'
      );
      window.location.reload();
    } catch (error) {
      ToasterHandler(t('scanFailed'), 'error');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const loadScanPaths = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const paths = await TauriAPI.getAllScanPaths();
      setScanPaths(paths as ScanPath[]);
    } catch (error) {
      console.error('Failed to load scan paths:', error);
      ToasterHandler(t('error'), 'error');
    }
    setIsLoading(false);
  }, [t]);

  React.useEffect(() => {
    loadScanPaths();
  }, [loadScanPaths]);

  const openAddDialog = () => {
    setDialogMode('add');
    setEditingId(null);
    setFormName('');
    setFormPath('');
    setDialogOpen(true);
  };

  const openEditDialog = (sp: ScanPath) => {
    setDialogMode('edit');
    setEditingId(sp.id);
    setFormName(sp.name);
    setFormPath(sp.path);
    setDialogOpen(true);
  };

  const handleBrowseDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('locationOnServer'),
      });
      if (selected) {
        setFormPath(selected);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPath.trim()) {
      ToasterHandler(t('error'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (dialogMode === 'add') {
        await TauriAPI.createScanPath(formName, formPath);
        ToasterHandler(t('scanPathAdded'), 'success');
      } else if (editingId) {
        await TauriAPI.updateScanPath(editingId, formName, formPath);
        ToasterHandler(t('scanPathUpdated'), 'success');
      }
      setDialogOpen(false);
      await loadScanPaths();
    } catch (error) {
      ToasterHandler(String(error), 'error');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await TauriAPI.deleteScanPath(id);
      ToasterHandler(t('scanPathDeleted'), 'success');
      await loadScanPaths();
    } catch (error) {
      ToasterHandler(String(error), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('libraries')}
          </h2>
          <p className="text-muted-foreground">{t('librariesDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleScanAll}
            disabled={isScanning || scanPaths.length === 0}
          >
            <RefreshCw
              className={'h-4 w-4 mr-2' + (isScanning ? ' animate-spin' : '')}
            />
            {isScanning ? t('loading') + '...' : t('scanAll')}
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addScanPath')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('loading')}...</p>
      ) : scanPaths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('no-libraries-configured-yet')}
            </p>
            <Button className="mt-4" variant="outline" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add-your-first-library')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scanPaths.map((sp) => (
            <Card key={sp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base truncate">
                      {sp.name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(sp)}
                      title={t('EDIT')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(sp.id)}
                      title={t('DELETE')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="truncate" title={sp.path}>
                  {sp.path}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? t('addScanPath') : t('modifyScanPath')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lib-name">{t('nameOfScanPath')}</Label>
              <Input
                id="lib-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('nameOfScanPath')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lib-path">{t('locationOnServer')}</Label>
              <div className="flex gap-2">
                <Input
                  id="lib-path"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  placeholder={t('locationOnServer') || '/path/to/library'}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleBrowseDirectory}
                  title={t('browse')}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formName.trim() || !formPath.trim()}
            >
              {isSaving
                ? t('loading') + '...'
                : dialogMode === 'add'
                  ? t('add')
                  : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
