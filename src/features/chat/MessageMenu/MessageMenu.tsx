import { useEffect, useRef } from 'react';
import { cx } from '../../../utils/cx.ts';
import { MessageAction } from './MessageAction.ts';
import styles from './MessageMenu.module.css';

type Props = {
  // What it offers, in order; Copy copies `text`.
  actions: MessageAction[];
  text: string | null;
  // Opens on the right for our messages, on the left for theirs.
  mine: boolean;
  onClose: () => void;
  // Any action but Copy, which the menu does itself.
  onAction: (action: MessageAction) => void;
};

const LABELS: Record<MessageAction, string> = {
  [MessageAction.Reply]: 'Reply',
  [MessageAction.Copy]: 'Copy text',
  [MessageAction.DontSend]: 'Don\'t send',
  [MessageAction.SendAgain]: 'Send again',
  [MessageAction.DeleteForMe]: 'Delete for me',
};

// Actions for one message, opened by tapping it (holding it, for files and locations).
export const MessageMenu = ({ actions, text, mine, onClose, onAction }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  // Keep it in view when the message is at the bottom of the list.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  // Tapping anywhere else, or Escape, closes it. (Tapping the message itself closes it there.)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) {
        onClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const choose = async (action: MessageAction) => {
    onClose();

    if (action === MessageAction.Copy) {
      await navigator.clipboard.writeText(text ?? '').catch(() => undefined);
    } else {
      onAction(action);
    }
  };

  return (
    <div
      ref={ref}
      className={cx(styles.menu, mine ? styles.right : styles.left)}
      role="menu"
      onClick={e => e.stopPropagation()}
    >
      {actions.map((action, index) => (
        <button
          key={action}
          className={cx(styles.item, action === MessageAction.DeleteForMe && styles.danger)}
          type="button"
          role="menuitem"
          autoFocus={index === 0}
          onClick={() => void choose(action)}
        >
          {LABELS[action]}
        </button>
      ))}
    </div>
  );
};
