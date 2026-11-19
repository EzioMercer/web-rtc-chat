import { startCall } from '../../store/thunks/call/startCall.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { IconButton } from '../IconButton/IconButton.tsx';
import styles from './ChatHeader.module.css';

export const ChatHeader = () => {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(state => state.connection.status === 'connected');
  const idle = useAppSelector(state => state.call.status === 'idle');
  const disabled = !connected || !idle;

  return (
    <div className={styles.header}>
      <span className={styles.title}>Peer</span>
      <div className={styles.actions}>
        <IconButton icon="phone" label="Audio call" disabled={disabled} onClick={() => dispatch(startCall(false))} />
        <IconButton icon="video" label="Video call" disabled={disabled} onClick={() => dispatch(startCall(true))} />
      </div>
    </div>
  );
};
