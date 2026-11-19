import type { ReactNode } from 'react';
import { startCall } from '../../store/thunks/call/startCall.ts';
import { selectConversation } from '../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { IconButton } from '../IconButton/IconButton.tsx';
import styles from './ChatHeader.module.css';

type Props = {
  convKey: string;
  title: string;
  subtitle: string;
  connected: boolean;
  // Extra buttons, e.g. the safety code.
  actions?: ReactNode;
};

export const ChatHeader = ({ convKey, title, subtitle, connected, actions }: Props) => {
  const dispatch = useAppDispatch();
  const idle = useAppSelector(state => state.call.status === 'idle');
  const disabled = !connected || !idle;

  return (
    <div className={styles.header}>
      <span className={styles.back}>
        <IconButton icon="back" label="Back to contacts" onClick={() => dispatch(selectConversation(null))} />
      </span>
      <div className={styles.titles}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
      </div>
      <div className={styles.actions}>
        {actions}
        <IconButton
          icon="phone"
          label="Audio call"
          disabled={disabled}
          onClick={() => dispatch(startCall(convKey, false))}
        />
        <IconButton
          icon="video"
          label="Video call"
          disabled={disabled}
          onClick={() => dispatch(startCall(convKey, true))}
        />
      </div>
    </div>
  );
};
