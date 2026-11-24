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

// Where one of our messages is: ◷ never left, ↻ went out before and goes again, ✓ sent, ✓✓ delivered, or "Not sent"
// (given up).
export const DeliveryMark = ({ pending, sent, tried, unsent, className }: Props) => {
  if (pending && unsent) {
    return <span className={cx(styles.mark, styles.unsent, className)}>Not sent</span>;
  }

  const glyphs = (): [string, string] => {
    if (!pending) {
      return ['✓✓', 'Delivered'];
    }

    if (sent) {
      return ['✓', 'Sent'];
    }

    return tried ? ['↻', 'Will be sent again'] : ['◷', 'Not sent yet'];
  };

  const [glyph, label] = glyphs();

  return (
    <span className={cx(styles.mark, pending && styles.pending, className)} title={label} aria-label={label}>
      {glyph}
    </span>
  );
};
