import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './OtherTabScreen.module.css';

// Shown while the app runs in another tab. It opens here by itself once that tab is closed.
export const OtherTabScreen = () => (
  <section className={styles.screen}>
    <span className={styles.icon}><Icon name="lock" size={32} /></span>
    <h1 className={styles.title}>Open in another tab</h1>
    <p className={styles.text}>
      P2P Chat can run in only one tab at a time. Close the other tab and it opens here.
    </p>
  </section>
);
