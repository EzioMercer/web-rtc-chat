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

enum SidebarDialog {
  Add,
  Settings,
}

export const Sidebar = () => {
  const [dialog, setDialog] = useState<SidebarDialog | null>(null);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Logo size={28} />
          P2P Chat
        </h1>
        <IconButton icon="settings" label="Settings" onClick={() => setDialog(SidebarDialog.Settings)} />
      </div>
      <div className={styles.add}>
        <Button wide onClick={() => setDialog(SidebarDialog.Add)}>
          <Icon name="userPlus" size={18} />
          Add contact
        </Button>
      </div>
      <ContactList />
      <UpdateNotice />
      {dialog === SidebarDialog.Add && <AddContactDialog onClose={() => setDialog(null)} />}
      {dialog === SidebarDialog.Settings && <SettingsDialog onClose={() => setDialog(null)} />}
    </aside>
  );
};
