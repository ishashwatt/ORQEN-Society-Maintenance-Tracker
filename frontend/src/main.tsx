import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string') {
      if (input.startsWith('/api')) {
        const backendPath = input.replace(/^\/api/, '');
        return originalFetch(`${apiBase}${backendPath}`, init);
      }
      if (input.startsWith('/uploads')) {
        return originalFetch(`${apiBase}${input}`, init);
      }
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
