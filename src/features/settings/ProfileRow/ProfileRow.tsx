import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './ProfileRow.module.css';

type Props = {
  onOpen: () => void;
};

// The first row of Settings: what our contacts see of us, opened in its own window.
export const ProfileRow = ({ onOpen }: Props) => (
  <button className={styles.row} type="button" onClick={onOpen}>
    <span className={styles.title}>Profile info</span>
    <Icon name="chevronRight" />
  </button>
);
