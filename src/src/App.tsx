import './App.css';
import './css/tailwind.css';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import Collectionner from './pages/Collectionner.tsx';
import Viewer from './pages/Viewer.tsx';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import ModelDownloadModal from './components/common/ModelDownloadModal.tsx';
import PdfiumDownloadModal from './components/common/PdfiumDownloadModal.tsx';
import UpdaterModal from './components/common/UpdaterModal.tsx';
import { usePlatform } from './hooks/use-platform.ts';

const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const ZOOMABLE_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';

function ZoomGuard() {
  const { pathname } = useLocation();
  const zoomable = pathname.startsWith('/viewer');

  useEffect(() => {
    document
      .querySelector('meta[name="viewport"]')
      ?.setAttribute('content', zoomable ? ZOOMABLE_VIEWPORT : LOCKED_VIEWPORT);
    document.documentElement.classList.toggle('zoom-locked', !zoomable);
    if (zoomable) return;
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', block);
    document.addEventListener('gesturechange', block);
    return () => {
      document.removeEventListener('gesturestart', block);
      document.removeEventListener('gesturechange', block);
    };
  }, [zoomable]);

  return null;
}

function App() {
  const platform = usePlatform();
  useEffect(() => {
    const unlisten = listen<string>('open-file', (event) => {
      const filePath = event.payload;
      console.log('Opening file from OS:', filePath);
      localStorage.setItem('currentBook', filePath);
      window.location.href = '/viewer';
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster position="bottom-left" richColors />
      {platform.ai && <ModelDownloadModal />}
      {platform.pdf && <PdfiumDownloadModal />}
      {platform.updater && <UpdaterModal />}
      <BrowserRouter>
        <ZoomGuard />
        <Routes>
          <Route path="/" element={<Navigate to="/collectionner" replace />} />
          <Route path="/collectionner" element={<Collectionner />} />
          <Route path="/viewer" element={<Viewer />} />
          <Route path="*" element={<Navigate to="/collectionner" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
