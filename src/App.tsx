import styles from './App.module.css';
import { Chat } from './components/Chat/Chat.tsx';
import { Header } from './components/Header/Header.tsx';
import { Setup } from './components/Setup/Setup.tsx';
import { useAppSelector } from './store/useAppSelector.ts';

export const App = () => {
  const status = useAppSelector(state => state.connection.status);
  const inChat = status === 'connected' || status === 'disconnected';

  return (
    <main className={styles.app}>
      <Header />
      {inChat ? <Chat /> : <Setup />}
    </main>
  );
};
