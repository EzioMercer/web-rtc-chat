import type { Message } from '../../../store/chat/types.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import { ReplyQuote } from '../ReplyQuote/ReplyQuote.tsx';
import styles from './ReplyBar.module.css';

type Props = {
  message: Message;
  peerName: string;
  onCancel: () => void;
};

// Above the message field while our next message answers one: what it answers, and X to send a normal one instead.
export const ReplyBar = ({ message, peerName, onCancel }: Props) => (
  <div className={styles.bar}>
    <span className={styles.icon}>
      <Icon name="reply" />
    </span>
    <div className={styles.quote}>
      <ReplyQuote message={message} peerName={peerName} />
    </div>
    <IconButton icon="close" label="Cancel reply" onClick={onCancel} />
  </div>
);
