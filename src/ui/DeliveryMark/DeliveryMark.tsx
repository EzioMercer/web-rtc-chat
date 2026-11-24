import { cx } from '../../utils/cx.ts';
import styles from './DeliveryMark.module.css';

type Props = {
  // Not confirmed by the other side yet.
  pending?: boolean;
  // Pending, and the connection took it.
  sent?: boolean;
  // Pending, and a connection took it before: it goes again.
  tried?: boolean;
  // Pending too long: no longer sent by itself.
  unsent?: boolean;
  className?: string;
};

// Drawn in a 18 x 12 box. The second check of "delivered" sits right of the first, its short stroke hidden behind it,
// as in other messengers.
const SHAPES = {
  sent: 'M2.5 6.5l3 3 7-7.5',
  delivered: 'M1 6.5l3 3 7-7.5M8.6 8.4l1.1 1.1 7-7.5',
  // A clock: not sent yet.
  waiting: 'M9 1.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9zM9 3.6v2.6l1.7 1',
  // Going round again: it goes again when the connection opens.
  again: 'M12.9 4.2A4.4 4.4 0 1 0 13.4 7M13.2 1.6v2.8h-2.8',
};

// Where one of our messages is: a clock (never left), an arrow round (went out before and goes again), ✓ sent, ✓✓
// delivered, or "Not sent" (given up).
export const DeliveryMark = ({ pending, sent, tried, unsent, className }: Props) => {
  if (pending && unsent) {
    return <span className={cx(styles.mark, styles.unsent, className)}>Not sent</span>;
  }

  const shape = (): [string, string] => {
    if (!pending) {
      return [SHAPES.delivered, 'Delivered'];
    }

    if (sent) {
      return [SHAPES.sent, 'Sent'];
    }

    return tried ? [SHAPES.again, 'Will be sent again'] : [SHAPES.waiting, 'Not sent yet'];
  };

  const [path, label] = shape();

  return (
    <span className={cx(styles.mark, pending && styles.pending, className)} title={label} aria-label={label}>
      <svg
        width={18}
        height={12}
        viewBox="0 0 18 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </span>
  );
};
