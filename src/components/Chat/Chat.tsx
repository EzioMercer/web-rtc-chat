import { Composer } from '../Composer/Composer.tsx';
import { MessageList } from '../MessageList/MessageList.tsx';
import styles from './Chat.module.css';

export const Chat = () => (
  <section className={styles.card}>
    <MessageList />
    <Composer />
  </section>
);
