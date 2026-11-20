import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { Message } from '../../store/chat/types.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { FileBubble } from '../FileBubble/FileBubble.tsx';
import { MessageMenu } from '../MessageMenu/MessageMenu.tsx';
import styles from './MessageList.module.css';

type Props = {
  convKey: string;
};

const NONE: Message[] = [];

// A press longer than this is the browser's text selection, not a tap.
const TAP_MS = 400;

// Chat text has a menu; files have their own buttons, and notes from the app have nothing to do.
const tappable = (message: Message) => message.kind === 'text' && message.from !== 'system';

export const MessageList = ({ convKey }: Props) => {
  const messages = useAppSelector(state => state.chat.conversations[convKey] ?? NONE);
  const listRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const pressedAt = useRef(0);

  // A tap opens the message menu. A long press or a text selection is left to the browser and its own menu.
  const tap = (e: MouseEvent, id: string) => {
    const selected = !(window.getSelection()?.isCollapsed ?? true);

    // A double or triple click selects words, not a menu.
    if (e.detail > 1) {
      setMenu(null);

      return;
    }

    if (selected || e.timeStamp - pressedAt.current > TAP_MS) {
      return;
    }

    e.stopPropagation();
    setMenu(current => (current === id ? null : id));
  };

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
        <div
          key={message.id}
          className={cx(styles.msg, styles[message.from], tappable(message) && styles.tappable)}
          onPointerDown={(e) => {
            pressedAt.current = e.timeStamp;
          }}
          onClick={tappable(message) ? e => tap(e, message.id) : undefined}
        >
          {message.kind === 'file' ? <FileBubble file={message} /> : message.text}
          {message.kind === 'text' && message.from === 'me' && (
            <span
              className={cx(styles.tick, message.pending && styles.pending)}
              title={message.pending ? 'Not delivered yet' : 'Delivered'}
              aria-label={message.pending ? 'Not delivered yet' : 'Delivered'}
            >
              {message.pending ? '◷' : '✓'}
            </span>
          )}
          {menu === message.id && message.kind === 'text' && (
            <MessageMenu text={message.text} mine={message.from === 'me'} onClose={() => setMenu(null)} />
          )}
        </div>
      ))}
    </div>
  );
};
