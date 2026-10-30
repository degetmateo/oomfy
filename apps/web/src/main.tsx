import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { usePwaStore } from './stores/pwaStore.js';
import './index.css';

usePwaStore.getState().initPwa();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

