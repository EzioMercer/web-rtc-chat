import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './EmptyPane.module.css';

type Props = {
  hasContacts: boolean;
};

export const EmptyPane = ({ hasContacts }: Props) => (
  <div className={styles.empty}>
    <Icon name="chat" size={40} />
    <p>{hasContacts ? 'Choose a contact to start chatting.' : 'Add your first contact to start chatting.'}</p>
  </div>
);
