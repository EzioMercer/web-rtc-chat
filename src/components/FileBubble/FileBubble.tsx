import type { FileMessage } from '../../store/chat/types.ts';
import { formatBytes } from '../../utils/formatBytes.ts';
import { Icon } from '../Icon/Icon.tsx';
import styles from './FileBubble.module.css';

type Props = {
  file: FileMessage;
};

// Inline preview for images, video and audio; a download card for everything else.
export const FileBubble = ({ file }: Props) => {
  const { name, size, mime, url, transferred, status, from } = file;
  const percent = size ? Math.round((transferred / size) * 100) : 100;
  const verb = from === 'me' ? 'Sending' : 'Receiving';

  const preview = () => {
    if (!url) {
      return null;
    }

    if (mime.startsWith('image/')) {
      return <img className={styles.media} src={url} alt={name} />;
    }

    if (mime.startsWith('video/')) {
      return <video className={styles.media} src={url} controls playsInline />;
    }

    if (mime.startsWith('audio/')) {
      return <audio className={styles.audio} src={url} controls />;
    }

    return null;
  };

  return (
    <div className={styles.file}>
      {preview()}
      <div className={styles.row}>
        <Icon name="file" size={22} />
        <div className={styles.info}>
          <span className={styles.name} title={name}>{name}</span>
          <span className={styles.meta}>
            {status === 'transferring' && `${verb}… ${percent}% · `}
            {status === 'failed' && <span className={styles.failed}>Failed · </span>}
            {formatBytes(size)}
          </span>
        </div>
        {status === 'done' && url && (
          <a className={styles.download} href={url} download={name} title="Download" aria-label="Download">
            <Icon name="download" />
          </a>
        )}
      </div>
      {status === 'transferring' && (
        <div className={styles.progress}>
          <div className={styles.bar} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
};
