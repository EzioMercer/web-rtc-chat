import { useEffect } from 'react';
import { useBackToList } from '../../hooks/useBackToList.ts';
import { conversationRead } from '../../store/chat/chatSlice.ts';
import { connectContact } from '../../store/thunks/contact/connectContact.ts';
import { openInvite } from '../../store/thunks/invite/openInvite.ts';
import { revokeFiles } from '../../store/thunks/chat/revokeFiles.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { store } from '../../store/store.ts';
import { MANUAL_KEY } from '../../webrtc/config.ts';
import { CallBanner } from '../CallBanner/CallBanner.tsx';
import { ChatPane } from '../ChatPane/ChatPane.tsx';
import { EmptyPane } from '../EmptyPane/EmptyPane.tsx';
import { ManualPane } from '../ManualPane/ManualPane.tsx';
import { ReceivedInviteDialog } from '../ReceivedInviteDialog/ReceivedInviteDialog.tsx';
import { RequestDialog } from '../RequestDialog/RequestDialog.tsx';
import { Sidebar } from '../Sidebar/Sidebar.tsx';
import styles from './Messenger.module.css';

// Contacts on the left, the open conversation on the right. On phones, one of the two fills the screen.
export const Messenger = () => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.ui.selected);
  const hasContacts = useAppSelector(state => state.contacts.list.length > 0);

  useBackToList();

  useEffect(() => {
    // An invite link pasted into the address bar while the app is open.
    const onHash = () => {
      if (window.location.hash.includes('invite=')) {
        dispatch(openInvite(window.location.hash));
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      }
    };

    // Coming back to the tab marks the open conversation as read.
    const onVisible = () => {
      const key = store.getState().ui.selected;

      if (!document.hidden && key) {
        dispatch(conversationRead(key));
      }
    };

    // Free received files from memory when the page goes away.
    const onHide = () => Object.values(store.getState().chat.conversations).forEach(revokeFiles);

    // The network came back (e.g. Wi-Fi to mobile data): reconnect the open conversation.
    const onOnline = () => {
      const { ui, contacts } = store.getState();

      if (ui.selected && contacts.list.some(c => c.id === ui.selected)) {
        void dispatch(connectContact(ui.selected));
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
    };
  }, [dispatch]);

  const pane = () => {
    if (selected === MANUAL_KEY) {
      return <ManualPane />;
    }

    return selected ? <ChatPane key={selected} id={selected} /> : <EmptyPane hasContacts={hasContacts} />;
  };

  return (
    <div className={styles.layout} data-open={Boolean(selected)}>
      <Sidebar />
      <main className={styles.pane}>{pane()}</main>
      <CallBanner />
      <ReceivedInviteDialog />
      <RequestDialog />
    </div>
  );
};
