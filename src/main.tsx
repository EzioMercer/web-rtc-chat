import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App.tsx';
import { registerWorker } from './core/worker/registerWorker.ts';
import { store } from './store/store.ts';
import './styles/global.css';
import { trackWindowHeight } from './utils/trackWindowHeight.ts';

trackWindowHeight();
registerWorker();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
