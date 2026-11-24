import { type Message, MessageAuthor } from '../../../store/chat/types.ts';
import { cx } from '../../../utils/cx.ts';
import { quotePreview } from './quotePreview.ts';
import styles from './ReplyQuote.module.css';

type Props = {
  // The message answered, as it is now.
  message: Message;
  peerName: string;
  // Drawn on our own bubble's colour.
  onMine?: boolean;
  // Inside a bubble: a tap shows the message answered. In the reply bar there is nothing to tap.
  onOpen?: () => void;
};

// Who wrote the message answered and what it says, in one line each.
export const ReplyQuote = ({ message, peerName, onMine, onOpen }: Props) => {
  const body = (
    <>
      <span className={styles.author}>{message.from === MessageAuthor.Me ? 'You' : peerName}</span>
      <span className={styles.preview}>{quotePreview(message)}</span>
    </>
  );

  if (!onOpen) {
    return <div className={cx(styles.quote, onMine && styles.onMine)}>{body}</div>;
  }

  return (
    <button
      className={cx(styles.quote, styles.button, onMine && styles.onMine)}
      type="button"
      // Holding it, a swipe or the right button still work as on the rest of the bubble; a tap is the quote's.
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      {body}
    </button>
  );
};
