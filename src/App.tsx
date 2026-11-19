import { useEffect } from 'react';
import { Messenger } from './components/Messenger/Messenger.tsx';
import { SetupScreen } from './components/SetupScreen/SetupScreen.tsx';
import { UnlockScreen } from './components/UnlockScreen/UnlockScreen.tsx';
import { initApp } from './store/thunks/app/initApp.ts';
import { useAppDispatch } from './store/useAppDispatch.ts';
import { useAppSelector } from './store/useAppSelector.ts';

let started = false;

export const App = () => {
  const dispatch = useAppDispatch();
  const phase = useAppSelector(state => state.app.phase);

  useEffect(() => {
    // Once per page, also under StrictMode's double effects.
    if (!started) {
      started = true;
      void dispatch(initApp());
    }
  }, [dispatch]);

  switch (phase) {
    case 'setup':
      return <SetupScreen />;
    case 'locked':
      return <UnlockScreen />;
    case 'ready':
      return <Messenger />;
    default:
      return null;
  }
};
