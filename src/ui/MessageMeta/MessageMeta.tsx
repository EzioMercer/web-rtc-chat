import type { ComponentProps } from 'react';
import { cx } from '../../utils/cx.ts';
import { formatClock } from '../../utils/formatClock.ts';
import { DeliveryMark } from '../DeliveryMark/DeliveryMark.tsx';
import styles from './MessageMeta.module.css';

type Props = {
  // When it was written, on this device's clock.
  at: number;
  // Ours: where it is (see DeliveryMark). Theirs have none.
  mark?: ComponentProps<typeof DeliveryMark>;
  // Over a picture or map: on a dark pill, so it can be read on anything.
  overlay?: boolean;
  className?: string;
};

// The time a message was written and, for ours, where it is: in the bubble's bottom right corner.
export const MessageMeta = ({ at, mark, overlay, className }: Props) => (
  <span className={cx(styles.meta, overlay && styles.overlay, className)}>
    <time dateTime={new Date(at).toISOString()}>{formatClock(at)}</time>
    {mark && <DeliveryMark {...mark} />}
  </span>
);
