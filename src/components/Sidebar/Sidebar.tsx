import { useState } from 'react';
import { AddContactDialog } from '../AddContactDialog/AddContactDialog.tsx';
import { Button } from '../Button/Button.tsx';
import { ContactList } from '../ContactList/ContactList.tsx';
import { Icon } from '../Icon/Icon.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { SettingsDialog } from '../SettingsDialog/SettingsDialog.tsx';
import { UpdateNotice } from '../UpdateNotice/UpdateNotice.tsx';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  const [dialog, setDialog] = useState<'add' | 'settings' | null>(null);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>P2P Chat</h1>
        <IconButton icon="settings" label="Settings" onClick={() => setDialog('settings')} />
      </div>
      <div className={styles.add}>
        <Button wide onClick={() => setDialog('add')}>
          <Icon name="userPlus" size={18} />
          Add contact
        </Button>
      </div>
      <ContactList />
      <UpdateNotice />
      {dialog === 'add' && <AddContactDialog onClose={() => setDialog(null)} />}
      {dialog === 'settings' && <SettingsDialog onClose={() => setDialog(null)} />}
    </aside>
  );
};
