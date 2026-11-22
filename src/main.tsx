import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App.tsx';
import { registerDownloadWorker } from './core/backup/registerDownloadWorker.ts';
import { store } from './store/store.ts';
import './styles/global.css';
import { trackWindowHeight } from './utils/trackWindowHeight.ts';

trackWindowHeight();
registerDownloadWorker();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
