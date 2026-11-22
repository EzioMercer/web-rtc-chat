import { useEffect, useState } from 'react';
import { useSafetyWords } from '../../contacts/useSafetyWords.ts';
import { verifiedSet } from '../../../store/contacts/contactsSlice.ts';
import { connectContact } from '../../../store/thunks/contact/connectContact.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { ChatHeader } from '../ChatHeader/ChatHeader.tsx';
import { Conversation } from '../Conversation/Conversation.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import { SafetyPanel } from '../../contacts/SafetyPanel/SafetyPanel.tsx';
import styles from './ChatPane.module.css';
import { getStatusText } from './getStatusText.ts';

// While a contact's chat is open and they are offline, check again this often.
const RETRY_MS = 20_000;

type Props = {
  id: string;
};

export const ChatPane = ({ id }: Props) => {
  const dispatch = useAppDispatch();
  const contact = useAppSelector(state => state.contacts.list.find(c => c.id === id));
  const status = useAppSelector(state => state.sessions.status[id] ?? 'idle');
  const detail = useAppSelector(state => state.sessions.detail[id] ?? '');
  const log = useAppSelector(state => state.sessions.log[id]);
  const route = useAppSelector(state => state.sessions.route[id]);
  const [showLog, setShowLog] = useState(false);
  const words = useSafetyWords(contact?.identity);
  // Open until the contact is verified, so a new contact shows the code right away.
  const [showSafety, setShowSafety] = useState(() => !contact?.verified);
  const connected = status === 'connected';

  useEffect(() => {
    if (status !== 'offline') {
      return;
    }

    const timer = window.setInterval(() => void dispatch(connectContact(id)), RETRY_MS);

    return () => window.clearInterval(timer);
  }, [dispatch, id, status]);

  if (!contact) {
    return null;
  }

  const header = (
    <ChatHeader
      convKey={id}
      title={contact.name}
      subtitle={`${getStatusText(status, route)}${contact.verified ? ' · verified' : ''}`}
      connected={connected}
      actions={(
        <>
          <IconButton
            icon="link"
            label="Connection log"
            variant={showLog ? 'neutral' : 'plain'}
            onClick={() => setShowLog(!showLog)}
          />
          <IconButton
            icon={contact.verified ? 'shieldCheck' : 'shield'}
            label="Safety code"
            variant={showSafety ? 'neutral' : 'plain'}
            onClick={() => setShowSafety(!showSafety)}
          />
        </>
      )}
    />
  );

  return (
    <Conversation convKey={id} connected={connected} header={header}>
      {showSafety && (
        <SafetyPanel
          words={words}
          verified={contact.verified}
          onVerify={() => {
            dispatch(verifiedSet({ id, verified: true }));
            setShowSafety(false);
          }}
          onUnverify={() => dispatch(verifiedSet({ id, verified: false }))}
        />
      )}
      {!showSafety && !contact.verified && (
        <button className={styles.bar} type="button" onClick={() => setShowSafety(true)}>
          Not verified yet. Tap to compare the safety code.
        </button>
      )}
      {status === 'connecting' && detail && (
        <div className={styles.offline}>
          <span>{detail}</span>
          <button className={styles.retry} type="button" onClick={() => setShowLog(!showLog)}>Details</button>
        </div>
      )}
      {status === 'offline' && (
        <div className={styles.offline}>
          <span>{detail || 'They aren\'t reachable. They need to have the app open.'}</span>
          <span className={styles.buttons}>
            <button className={styles.retry} type="button" onClick={() => setShowLog(!showLog)}>Details</button>
            <button className={styles.retry} type="button" onClick={() => void dispatch(connectContact(id))}>
              Try again
            </button>
          </span>
        </div>
      )}
      {showLog && (
        <pre className={styles.log} aria-label="Connection log">{(log ?? ['Nothing yet.']).join('\n')}</pre>
      )}
    </Conversation>
  );
};
