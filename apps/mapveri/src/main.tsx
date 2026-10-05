import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { registerServiceWorker } from '@/lib/pwa';

setAuthTokenGetter(() => window.localStorage.getItem('mapveri_token'));
registerServiceWorker();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
