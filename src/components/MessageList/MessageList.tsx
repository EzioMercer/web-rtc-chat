import { useEffect, useRef } from 'react';
import type { Message } from '../../store/chat/types.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { FileBubble } from '../FileBubble/FileBubble.tsx';
import styles from './MessageList.module.css';

type Props = {
  convKey: string;
};

const NONE: Message[] = [];

export const MessageList = ({ convKey }: Props) => {
  const messages = useAppSelector(state => state.chat.conversations[convKey] ?? NONE);
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
      {messages.map(message => (
        <div key={message.id} className={cx(styles.msg, styles[message.from])}>
          {message.kind === 'file' ? <FileBubble file={message} /> : message.text}
        </div>
      ))}
    </div>
  );
};
