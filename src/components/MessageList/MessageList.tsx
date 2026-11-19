import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import styles from './MessageList.module.css';

export const MessageList = () => {
  const messages = useAppSelector(state => state.chat.messages);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div ref={listRef} className={styles.list}>
      {messages.map(({ id, from, text }) => (
        <div key={id} className={cx(styles.msg, styles[from])}>{text}</div>
      ))}
    </div>
  );
};
