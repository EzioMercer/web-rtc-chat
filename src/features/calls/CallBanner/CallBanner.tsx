import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { selectConversation } from '../../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import styles from './CallBanner.module.css';
import { CallStatus } from '../../../store/call/types.ts';

// A call with a contact whose chat isn't open: show it, with a way to get there.
export const CallBanner = () => {
  const dispatch = useAppDispatch();
  const { key, status } = useAppSelector(state => state.call);
  const selected = useAppSelector(state => state.ui.selected);
  const name = useAppSelector(state => state.contacts.list.find(c => c.id === key)?.name);

  if (!key || status === CallStatus.Idle || key === selected) {
    return null;
  }

  const who = key === MANUAL_KEY ? 'the manual connection' : (name ?? 'a contact');
  const text = status === CallStatus.Incoming ? `Incoming call from ${who}` : `In a call with ${who}`;

  return (
    <button className={styles.banner} type="button" onClick={() => dispatch(selectConversation(key))}>
      {text}
      {' · '}
      <b>Open</b>
    </button>
  );
};
