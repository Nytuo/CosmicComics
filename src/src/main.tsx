import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './i18n.ts';
import { SuspensePage } from './pages/SuspensePage.tsx';

const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(`theme-${savedTheme}`);

async function start() {
  if (import.meta.env.DEV) {
    // `?mock=mobile|desktop` runs the UI against fake data (see dev/mockTauri.ts).
    const asked = new URLSearchParams(window.location.search).get('mock');
    if (asked === 'off') sessionStorage.removeItem('mockTauri');
    else if (asked) sessionStorage.setItem('mockTauri', asked);
    if (
      sessionStorage.getItem('mockTauri') &&
      !('__TAURI_INTERNALS__' in window)
    ) {
      (await import('./dev/mockTauri.ts')).installTauriMock();
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Suspense fallback={<SuspensePage />}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
}

start();
