import { useState } from 'react';
import { AddContactDialog } from '../../contacts/AddContactDialog/AddContactDialog.tsx';
import { Button } from '../../../ui/Button/Button.tsx';
import { ContactList } from '../../contacts/ContactList/ContactList.tsx';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import { Logo } from '../../../ui/Logo/Logo.tsx';
import { SettingsDialog } from '../../settings/SettingsDialog/SettingsDialog.tsx';
import { UpdateNotice } from '../UpdateNotice/UpdateNotice.tsx';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  const [dialog, setDialog] = useState<'add' | 'settings' | null>(null);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Logo size={28} />
          P2P Chat
        </h1>
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
