import { useEffect } from 'react';
import { BackupProgress } from './features/backup/BackupProgress/BackupProgress.tsx';
import { Messenger } from './features/app/Messenger/Messenger.tsx';
import { OtherTabScreen } from './features/app/OtherTabScreen/OtherTabScreen.tsx';
import { SetupScreen } from './features/setup/SetupScreen/SetupScreen.tsx';
import { UnlockScreen } from './features/setup/UnlockScreen/UnlockScreen.tsx';
import { initApp } from './store/thunks/app/initApp.ts';
import { useAppDispatch } from './store/useAppDispatch.ts';
import { useAppSelector } from './store/useAppSelector.ts';
import { AppPhase } from './store/app/types.ts';

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

  const screen = () => {
    switch (phase) {
      case AppPhase.Setup:
        return <SetupScreen />;
      case AppPhase.Locked:
        return <UnlockScreen />;
      case AppPhase.Ready:
        return <Messenger />;
      case AppPhase.OtherTab:
        return <OtherTabScreen />;
      default:
        return null;
    }
  };

  return (
    <>
      {screen()}
      <BackupProgress />
    </>
  );
};
