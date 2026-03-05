import './App.css';
import './css/tailwind.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Collectionner from './pages/Collectionner.tsx';
import Viewer from './pages/Viewer.tsx';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import ModelDownloadModal from './components/common/ModelDownloadModal.tsx';
import PdfiumDownloadModal from './components/common/PdfiumDownloadModal.tsx';
import UpdaterModal from './components/common/UpdaterModal.tsx';

function App() {
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
      <ModelDownloadModal />
      <PdfiumDownloadModal />
      <UpdaterModal />
      <BrowserRouter>
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
