import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { getStatusLabel } from '../../utils/getStatusLabel.ts';
import styles from './StatusBadge.module.css';

export const StatusBadge = () => {
  const connection = useAppSelector(state => state.connection);
  const { status } = connection;
  const pending = status === 'generating' || status === 'waiting' || status === 'connecting';

  return (
    <span
      className={cx(
        styles.badge,
        pending && styles.pending,
        status === 'connected' && styles.connected,
        status === 'failed' && styles.failed,
      )}
    >
      {getStatusLabel(connection)}
    </span>
  );
};
