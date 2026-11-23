import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { type Message, MessageKind, NoteType } from '../../../store/chat/types.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { cx } from '../../../utils/cx.ts';
import { LocationBubble } from '../../location/LocationBubble/LocationBubble.tsx';
import { FileBubble } from '../FileBubble/FileBubble.tsx';
import { MessageMenu } from '../MessageMenu/MessageMenu.tsx';
import styles from './MessageList.module.css';

type Props = {
  convKey: string;
};

const NONE: Message[] = [];

// A touch held longer than this is the phone's text selection, not a tap.
const TAP_MS = 400;

// Chat text has a menu; files have their own buttons, and notes from the app have nothing to do.
const tappable = (message: Message) => message.kind === MessageKind.Text && message.from !== 'system';

// Round video messages stand on their own, without a bubble around them.
const bare = (message: Message) => message.kind === MessageKind.File && message.note?.type === NoteType.Video;

// A kind this version doesn't know was saved by a newer one: it stays saved as it is, shown as a note.
const content = (convKey: string, message: Message) => {
  switch (message.kind) {
    case MessageKind.File:
      return <FileBubble chat={convKey} file={message} />;
    case MessageKind.Text:
      return message.text;
    case MessageKind.Location:
      return <LocationBubble chat={convKey} location={message} />;
    default:
      return <i>This message needs a newer version of the app.</i>;
  }
};

export const MessageList = ({ convKey }: Props) => {
  const messages = useAppSelector(state => state.chat.conversations[convKey] ?? NONE);
  const listRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const press = useRef({ at: 0, touch: false });

  const textSelected = () => !(window.getSelection()?.isCollapsed ?? true);

  // On a phone, a tap opens the message menu; a long press (selecting text) is left to the phone and its menu.
  const tap = (e: MouseEvent, id: string) => {
    if (!press.current.touch || textSelected() || e.timeStamp - press.current.at > TAP_MS) {
      return;
    }

    e.stopPropagation();
    setMenu(current => (current === id ? null : id));
  };

  // With a mouse or touchpad, the right button (or two-finger tap) opens it instead of the browser's menu, unless
  // text is selected: then the browser's menu can copy the selection. On a phone a long press also sends this
  // event; that one is left to the phone.
  const contextMenu = (e: MouseEvent, id: string) => {
    if (press.current.touch || textSelected()) {
      return;
    }

    e.preventDefault();
    setMenu(id);
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
          className={cx(
            styles.msg,
            styles[message.from],
            tappable(message) && styles.tappable,
            bare(message) && styles.bare,
            message.kind === MessageKind.Location && styles.card,
          )}
          onPointerDown={(e) => {
            press.current = { at: e.timeStamp, touch: e.pointerType !== 'mouse' };
          }}
          onClick={tappable(message) ? e => tap(e, message.id) : undefined}
          onContextMenu={tappable(message) ? e => contextMenu(e, message.id) : undefined}
        >
          {content(convKey, message)}
          {message.kind === MessageKind.Text && message.from === 'me' && (
            <span
              className={cx(styles.tick, message.pending && styles.pending)}
              title={message.pending ? 'Not delivered yet' : 'Delivered'}
              aria-label={message.pending ? 'Not delivered yet' : 'Delivered'}
            >
              {message.pending ? '◷' : '✓'}
            </span>
          )}
          {menu === message.id && message.kind === MessageKind.Text && (
            <MessageMenu text={message.text} mine={message.from === 'me'} onClose={() => setMenu(null)} />
          )}
        </div>
      ))}
    </div>
  );
};
