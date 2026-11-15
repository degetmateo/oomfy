import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { usePwaStore } from './stores/pwaStore.js';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from './utils/safeStorage.js';
import './index.css';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (safeSessionGet('oomfy_preload_retried')) return;
  safeSessionSet('oomfy_preload_retried', '1');
  const clearCaches = 'caches' in window
    ? window.caches.keys().then((ks) => Promise.all(ks.map((k) => window.caches.delete(k))))
    : Promise.resolve();
  clearCaches.catch(() => {}).finally(() => window.location.reload());
});
window.addEventListener('load', () => safeSessionRemove('oomfy_preload_retried'));

usePwaStore.getState().initPwa();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

