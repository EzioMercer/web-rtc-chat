import { useEffect } from 'react';
import { useBackToList } from '../useBackToList.ts';
import { historySaver } from '../../../core/history/historySaver.ts';
import { reconnectRelays } from '../../../core/nostr/listen.ts';
import { useCallSounds } from '../../calls/useCallSounds.ts';
import { seeConversation } from '../../../store/thunks/chat/seeConversation.ts';
import { connectContact } from '../../../store/thunks/contact/connectContact.ts';
import { openInvite } from '../../../store/thunks/invite/openInvite.ts';
import { revokeFiles } from '../../../store/thunks/chat/revokeFiles.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { store } from '../../../store/store.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { CallBanner } from '../../calls/CallBanner/CallBanner.tsx';
import { ChatPane } from '../../chat/ChatPane/ChatPane.tsx';
import { EmptyPane } from '../EmptyPane/EmptyPane.tsx';
import { ManualPane } from '../../manual/ManualPane/ManualPane.tsx';
import { ReceivedInviteDialog } from '../../contacts/ReceivedInviteDialog/ReceivedInviteDialog.tsx';
import { RequestDialog } from '../../contacts/RequestDialog/RequestDialog.tsx';
import { Sidebar } from '../Sidebar/Sidebar.tsx';
import styles from './Messenger.module.css';

// Back from the background after longer than this: renew relay connections and reconnect.
const BACKGROUND_RENEW_MS = 10_000;

// Contacts on the left, the open conversation on the right. On phones, one of the two fills the screen.

export const Messenger = () => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.ui.selected);
  const hasContacts = useAppSelector(state => state.contacts.list.length > 0);

  useBackToList();
  useCallSounds();

  useEffect(() => {
    // An invite link pasted into the address bar while the app is open.
    const onHash = () => {
      if (window.location.hash.includes('invite=')) {
        dispatch(openInvite(window.location.hash));
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      }
    };

    // The network came back (e.g. Wi-Fi to mobile data): reconnect the open conversation.
    const reconnectSelected = () => {
      const { ui, contacts } = store.getState();

      if (ui.selected && contacts.list.some(c => c.id === ui.selected)) {
        void dispatch(connectContact(ui.selected));
      }
    };

    let hiddenAt = 0;

    // Coming back to the tab, what came to the open conversation meanwhile is seen. After a while in the background
    // (phones pause apps there), the relay connections are renewed and the open conversation reconnects.
    const onVisible = () => {
      const key = store.getState().ui.selected;

      if (document.hidden) {
        hiddenAt = Date.now();

        return;
      }

      if (key) {
        dispatch(seeConversation(key));
      }

      if (hiddenAt && Date.now() - hiddenAt > BACKGROUND_RENEW_MS) {
        reconnectRelays();
        reconnectSelected();
      }

      hiddenAt = 0;
    };

    // Save what is still waiting, and free received files from memory, when the page goes away.
    const onHide = () => {
      void historySaver.flush();
      Object.values(store.getState().chat.conversations).forEach(revokeFiles);
    };

    window.addEventListener('online', reconnectSelected);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);

    return () => {
      window.removeEventListener('online', reconnectSelected);
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
