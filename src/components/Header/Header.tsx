import { StatusBadge } from '../StatusBadge/StatusBadge.tsx';
import styles from './Header.module.css';

export const Header = () => (
  <header className={styles.header}>
    <h1 className={styles.title}>P2P Chat</h1>
    <StatusBadge />
  </header>
);
