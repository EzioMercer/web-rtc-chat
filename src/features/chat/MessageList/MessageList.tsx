import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useToday } from '../../../hooks/useToday.ts';
import { canReply } from '../../../store/chat/canReply.ts';
import { type Message, MessageAuthor, MessageKind, NoteType } from '../../../store/chat/types.ts';
import { deleteMessage } from '../../../store/thunks/chat/deleteMessage.ts';
import { findMessage } from '../../../store/thunks/chat/findMessage.ts';
import { sendAgain } from '../../../store/thunks/chat/sendAgain.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { replyStarted } from '../../../store/ui/uiSlice.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog.tsx';
import { MessageMeta } from '../../../ui/MessageMeta/MessageMeta.tsx';
import { cx } from '../../../utils/cx.ts';
import { formatDay } from '../../../utils/formatDay.ts';
import { startOfDay } from '../../../utils/startOfDay.ts';
import { LocationBubble } from '../../location/LocationBubble/LocationBubble.tsx';
import { FileBubble } from '../FileBubble/FileBubble.tsx';
import { MessageAction } from '../MessageMenu/MessageAction.ts';
import { MessageMenu } from '../MessageMenu/MessageMenu.tsx';
import { ReplyQuote } from '../ReplyQuote/ReplyQuote.tsx';
import { usePeerName } from '../usePeerName.ts';
import { deleteQuestion } from './deleteQuestion.ts';
import { messageActions } from './messageActions.ts';
import { metaFor } from './metaFor.ts';
import styles from './MessageList.module.css';
import { useSwipeReply } from './useSwipeReply.ts';

type Props = {
  convKey: string;
};

const NONE: Message[] = [];

// Where the day labels and the "Unread messages" line go: before the first shown message of each day, and before the
// first shown one from `line` (the message that was the first unread one) on. Messages are almost always in time
// order; one slightly out of it (it waited) never brings a day back, so no day shows twice.
const listMarks = (messages: Message[], line: string | null) => {
  const days = new Set<string>();
  const lineAt = line === null ? -1 : messages.findIndex(message => message.id === line);
  let lineBefore: string | null = null;
  let lastDay = -Infinity;

  messages.forEach((message, index) => {
    if (message.kind === MessageKind.Deleted) {
      return;
    }

    const day = startOfDay(message.at);

    if (day > lastDay) {
      days.add(message.id);
      lastDay = day;
    }

    if (lineAt >= 0 && lineBefore === null && index >= lineAt) {
      lineBefore = message.id;
    }
  });

  return { days, lineBefore };
};

// A touch held longer than this is the phone's text selection, not a tap.
const TAP_MS = 400;

// A message shown from a reply's quote stands out this long (ms).
const FLASH_MS = 1500;

// Holding a file or location this long opens its menu (a tap there plays or opens it)...
const HOLD_MS = 500;
// ...unless the finger moved this far (px): then it is scrolling.
const HOLD_SLOP = 10;

// Chat text opens its menu with a tap; files and locations, whose tap plays or opens them, with a long press.
const tappable = (message: Message) => message.kind === MessageKind.Text;

// Round video messages stand on their own, without a bubble around them.
const bare = (message: Message) => message.kind === MessageKind.File && message.note?.type === NoteType.Video;

// Where the time and mark go: in the corner of a text or voice message, next to its last line when there's room
// (a hidden copy keeps the room free); on a line of its own under a file or round video; a location draws its own.
// The app's own notes have none.
const metaPlace = (message: Message): 'corner' | 'line' | null => {
  if (message.from === MessageAuthor.System) {
    return null;
  }

  if (message.kind === MessageKind.Text
    || (message.kind === MessageKind.File && message.note?.type === NoteType.Voice)) {
    return 'corner';
  }

  return message.kind === MessageKind.File ? 'line' : null;
};

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
  // Messages by id, for the quotes of replies.
  const byId = useMemo(() => new Map(messages.map(message => [message.id, message])), [messages]);
  const peerName = usePeerName(convKey);
  // The message just shown from a quote.
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef(0);
  const today = useToday();
  const line = useAppSelector(state => (state.ui.unreadLine?.key === convKey ? state.ui.unreadLine.id : null));
  const marks = useMemo(() => listMarks(messages, line), [messages, line]);

  const startReply = (id: string) => {
    setMenu(null);
    dispatch(replyStarted({ key: convKey, id }));
  };

  const swipe = useSwipeReply(startReply);

  // A reply's quote was tapped: the message it answers comes into view and stands out for a moment.
  const showOriginal = (id: string) => {
    const element = listRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`);

    if (!element) {
      return;
    }

    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlash(id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  };

  const textSelected = () => !(window.getSelection()?.isCollapsed ?? true);

  // What a message's menu offers now (read from the store: a timer may open it).
  const menuFor = (id: string) => {
    const message = dispatch(findMessage(convKey, id));

    return message ? { id, actions: messageActions(message) } : null;
  };

  // "Delete for me" asks first; "Don't send" doesn't (nothing went anywhere yet), unless it went out meanwhile.
  const act = (id: string, action: MessageAction) => {
    const now = dispatch(findMessage(convKey, id));

    if (action === MessageAction.Reply) {
      startReply(id);
    } else if (action === MessageAction.DontSend && now && messageActions(now).includes(MessageAction.DontSend)) {
      dispatch(deleteMessage(convKey, id));
    } else if (action === MessageAction.DeleteForMe || action === MessageAction.DontSend) {
      setAsking(id);
    } else if (action === MessageAction.SendAgain) {
      dispatch(sendAgain(convKey, id));
    }
  };

  // On a phone, a tap opens the message menu; a long press (selecting text) is left to the phone and its menu.
  const tap = (e: MouseEvent, id: string) => {
    if (swipe.justSwiped() || !press.current.touch || textSelected() || e.timeStamp - press.current.at > TAP_MS) {
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
    if (swipe.justSwiped() || held.current) {
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

  useEffect(() => () => {
    endHold();
    window.clearTimeout(flashTimer.current);
  }, []);

  // Keep the newest message in view when one is added (not when an older one is deleted).
  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [last]);

  // Opening a chat with unread messages starts at the first of them (after the newest was put in view above).
  useEffect(() => {
    if (line !== null) {
      listRef.current?.querySelector(`.${styles.unreadLine}`)?.scrollIntoView({ block: 'start' });
    }
  }, [line]);

  return (
    <div ref={listRef} className={styles.list}>
      {messages.map((message) => {
        if (message.kind === MessageKind.Deleted) {
          return null;
        }

        const original = message.replyTo === undefined ? undefined : byId.get(message.replyTo);
        const mine = message.from === MessageAuthor.Me;
        const answerable = canReply(message);
        const swiped = swipe.swipe?.id === message.id ? swipe.swipe : null;

        return (
          <Fragment key={message.id}>
            {marks.days.has(message.id) && (
              <div className={styles.day}><span>{formatDay(message.at, today)}</span></div>
            )}
            {marks.lineBefore === message.id && <div className={styles.unreadLine}>Unread messages</div>}
            <div
              data-id={message.id}
              className={cx(
                styles.msg,
                styles[message.from],
                tappable(message) ? styles.tappable : styles.holdable,
                bare(message) && styles.bare,
                message.kind === MessageKind.Location && styles.card,
                flash === message.id && styles.flash,
                swiped && styles.swiping,
              )}
              style={swiped ? { transform: `translateX(${swiped.offset}px)` } : undefined}
              onPointerDown={(e) => {
                press.current = { at: e.timeStamp, touch: e.pointerType !== 'mouse' };
                swipe.down(e, message.id, answerable);

                if (!tappable(message)) {
                  startHold(e, message.id);
                }
              }}
              onPointerMove={(e) => {
                if (swipe.move(e)) {
                  endHold();
                } else if (!tappable(message)) {
                  moveHold(e);
                }
              }}
              onPointerUp={() => {
                endHold();
                swipe.up();
              }}
              onPointerCancel={() => {
                endHold();
                swipe.cancel();
              }}
              onClickCapture={tappable(message) ? undefined : swallowClick}
              onClick={tappable(message) ? e => tap(e, message.id) : undefined}
              onContextMenu={e => (tappable(message) ? contextMenu(e, message.id) : holdMenu(e, message.id))}
            >
              {original && (
                <ReplyQuote
                  message={original}
                  peerName={peerName}
                  onMine={mine && !bare(message)}
                  onOpen={() => showOriginal(original.id)}
                />
              )}
              {content(convKey, message)}
              {metaPlace(message) === 'corner' && (
                <>
                  {message.kind === MessageKind.Text && (
                    <span className={styles.room} aria-hidden="true">
                      <MessageMeta {...metaFor(message)} />
                    </span>
                  )}
                  <MessageMeta {...metaFor(message)} className={styles.corner} />
                </>
              )}
              {metaPlace(message) === 'line' && (
                <div className={styles.metaLine}>
                  <MessageMeta {...metaFor(message)} overlay={bare(message)} />
                </div>
              )}
              {answerable && (
              // With a mouse: shows beside the bubble while the pointer is over it.
                <button
                  className={styles.replyButton}
                  type="button"
                  title="Reply"
                  aria-label="Reply"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    startReply(message.id);
                  }}
                >
                  <span className={styles.replyCircle}>
                    <Icon name="reply" size={16} />
                  </span>
                </button>
              )}
              {swiped && (
                <span
                  className={cx(styles.swipeArrow, swiped.ready && styles.ready)}
                  style={{ opacity: swiped.progress }}
                >
                  <Icon name="reply" size={18} />
                </span>
              )}
              {menu?.id === message.id && (
                <MessageMenu
                  actions={menu.actions}
                  text={message.kind === MessageKind.Text ? message.text : null}
                  mine={mine}
                  onClose={() => setMenu(null)}
                  onAction={action => act(message.id, action)}
                />
              )}
            </div>
          </Fragment>
        );
      })}
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
