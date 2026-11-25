import { useState } from 'react';
import { markAllChatsRead } from '../../../store/thunks/chat/markAllChatsRead.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { AddContactDialog } from '../../contacts/AddContactDialog/AddContactDialog.tsx';
import { Button } from '../../../ui/Button/Button.tsx';
import { ContactList } from '../../contacts/ContactList/ContactList.tsx';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import { Logo } from '../../../ui/Logo/Logo.tsx';
import { SettingsDialog } from '../../settings/SettingsDialog/SettingsDialog.tsx';
import { useAnyUnread } from '../../contacts/useAnyUnread.ts';
import { UpdateNotice } from '../UpdateNotice/UpdateNotice.tsx';
import styles from './Sidebar.module.css';

enum SidebarDialog {
  Add,
  Settings,
}

export const Sidebar = () => {
  const dispatch = useAppDispatch();
  const [dialog, setDialog] = useState<SidebarDialog | null>(null);
  const anyUnread = useAnyUnread();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Logo size={28} />
          P2P Chat
        </h1>
        <div className={styles.actions}>
          {anyUnread && (
            <IconButton icon="checkAll" label="Mark all as read" onClick={() => dispatch(markAllChatsRead())} />
          )}
          <IconButton icon="settings" label="Settings" onClick={() => setDialog(SidebarDialog.Settings)} />
        </div>
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
