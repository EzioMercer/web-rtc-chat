import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { type Message, MessageAuthor, MessageKind, NoteType } from '../../../store/chat/types.ts';
import { deleteMessage } from '../../../store/thunks/chat/deleteMessage.ts';
import { findMessage } from '../../../store/thunks/chat/findMessage.ts';
import { sendAgain } from '../../../store/thunks/chat/sendAgain.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog.tsx';
import { DeliveryMark } from '../../../ui/DeliveryMark/DeliveryMark.tsx';
import { cx } from '../../../utils/cx.ts';
import { LocationBubble } from '../../location/LocationBubble/LocationBubble.tsx';
import { FileBubble } from '../FileBubble/FileBubble.tsx';
import { MessageAction } from '../MessageMenu/MessageAction.ts';
import { MessageMenu } from '../MessageMenu/MessageMenu.tsx';
import { deleteQuestion } from './deleteQuestion.ts';
import { messageActions } from './messageActions.ts';
import styles from './MessageList.module.css';

type Props = {
  convKey: string;
};

const NONE: Message[] = [];

// A touch held longer than this is the phone's text selection, not a tap.
const TAP_MS = 400;

// Holding a file or location this long opens its menu (a tap there plays or opens it)...
const HOLD_MS = 500;
// ...unless the finger moved this far (px): then it is scrolling.
const HOLD_SLOP = 10;

// Chat text opens its menu with a tap; files and locations, whose tap plays or opens them, with a long press.
const tappable = (message: Message) => message.kind === MessageKind.Text;

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
  const dispatch = useAppDispatch();
  const messages = useAppSelector(state => state.chat.conversations[convKey] ?? NONE);
  const listRef = useRef<HTMLDivElement>(null);
  // The open menu: its message and what it offered when it opened (it doesn't change under the finger).
  const [menu, setMenu] = useState<{ id: string; actions: MessageAction[] } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const press = useRef({ at: 0, touch: false });
  // A long press under way (its timer and where it started), and whether one just opened a menu: the click that
  // follows the finger lifting must not also play or open the item.
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const held = useRef(false);
  const asked = messages.find(message => message.id === asking);
  const last = messages.at(-1)?.id;

  const textSelected = () => !(window.getSelection()?.isCollapsed ?? true);

  // What a message's menu offers now (read from the store: a timer may open it).
  const menuFor = (id: string) => {
    const message = dispatch(findMessage(convKey, id));

    return message ? { id, actions: messageActions(message) } : null;
  };

  // "Delete for me" asks first; "Don't send" doesn't (nothing went anywhere yet), unless it went out meanwhile.
  const act = (id: string, action: MessageAction) => {
    const now = dispatch(findMessage(convKey, id));

    if (action === MessageAction.DontSend && now && messageActions(now).includes(MessageAction.DontSend)) {
      dispatch(deleteMessage(convKey, id));
    } else if (action === MessageAction.DeleteForMe || action === MessageAction.DontSend) {
      setAsking(id);
    } else if (action === MessageAction.SendAgain) {
      dispatch(sendAgain(convKey, id));
    }
  };

  // On a phone, a tap opens the message menu; a long press (selecting text) is left to the phone and its menu.
  const tap = (e: MouseEvent, id: string) => {
    if (!press.current.touch || textSelected() || e.timeStamp - press.current.at > TAP_MS) {
      return;
    }

    e.stopPropagation();
    setMenu(current => (current?.id === id ? null : menuFor(id)));
  };

  // With a mouse or touchpad, the right button (or two-finger tap) opens it instead of the browser's menu, unless
  // text is selected: then the browser's menu can copy the selection. On a phone a long press also sends this
  // event; that one is left to the phone.
  const contextMenu = (e: MouseEvent, id: string) => {
    if (press.current.touch || textSelected()) {
      return;
    }

    e.preventDefault();
    setMenu(menuFor(id));
  };

  const endHold = () => {
    if (hold.current) {
      window.clearTimeout(hold.current.timer);
      hold.current = null;
    }
  };

  const startHold = (e: PointerEvent, id: string) => {
    endHold();
    held.current = false;

    if (e.pointerType === 'mouse') {
      return;
    }

    const timer = window.setTimeout(() => {
      hold.current = null;
      held.current = true;
      setMenu(menuFor(id));
    }, HOLD_MS);

    hold.current = { timer, x: e.clientX, y: e.clientY };
  };

  const moveHold = (e: PointerEvent) => {
    const start = hold.current;

    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > HOLD_SLOP) {
      endHold();
    }
  };

  // The click after a long press only closes the press.
  const swallowClick = (e: MouseEvent) => {
    if (held.current) {
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // A file or location: the right button opens the menu; on a phone the long press does (see startHold), and the
  // phone's own menu for a picture or link stays shut.
  const holdMenu = (e: MouseEvent, id: string) => {
    e.preventDefault();

    if (!press.current.touch) {
      setMenu(menuFor(id));
    }
  };

  useEffect(() => endHold, []);

  // Keep the newest message in view when one is added (not when an older one is deleted).
  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [last]);

  return (
    <div ref={listRef} className={styles.list}>
      {messages.map(message => message.kind !== MessageKind.Deleted && (
        <div
          key={message.id}
          className={cx(
            styles.msg,
            styles[message.from],
            tappable(message) ? styles.tappable : styles.holdable,
            bare(message) && styles.bare,
            message.kind === MessageKind.Location && styles.card,
          )}
          onPointerDown={(e) => {
            press.current = { at: e.timeStamp, touch: e.pointerType !== 'mouse' };

            if (!tappable(message)) {
              startHold(e, message.id);
            }
          }}
          onPointerMove={tappable(message) ? undefined : moveHold}
          onPointerUp={tappable(message) ? undefined : endHold}
          onPointerCancel={tappable(message) ? undefined : endHold}
          onClickCapture={tappable(message) ? undefined : swallowClick}
          onClick={tappable(message) ? e => tap(e, message.id) : undefined}
          onContextMenu={e => (tappable(message) ? contextMenu(e, message.id) : holdMenu(e, message.id))}
        >
          {content(convKey, message)}
          {message.kind === MessageKind.Text && message.from === MessageAuthor.Me && (
            <DeliveryMark
              pending={message.pending}
              sent={message.sent}
              tried={message.tried}
              unsent={message.unsent}
              className={styles.tick}
            />
          )}
          {menu?.id === message.id && (
            <MessageMenu
              actions={menu.actions}
              text={message.kind === MessageKind.Text ? message.text : null}
              mine={message.from === MessageAuthor.Me}
              onClose={() => setMenu(null)}
              onAction={action => act(message.id, action)}
            />
          )}
        </div>
      ))}
      {asked && (
        <ConfirmDialog
          title="Delete for me?"
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setAsking(null);
            dispatch(deleteMessage(convKey, asked.id));
          }}
          onCancel={() => setAsking(null)}
        >
          {deleteQuestion(asked)}
        </ConfirmDialog>
      )}
    </div>
  );
};
