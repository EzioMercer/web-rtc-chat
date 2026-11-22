import { type FileMessage, NoteType, FileStatus } from '../../../store/chat/types.ts';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { VideoNoteBubble } from '../../recording/VideoNoteBubble/VideoNoteBubble.tsx';
import { VoiceBubble } from '../../recording/VoiceBubble/VoiceBubble.tsx';
import styles from './FileBubble.module.css';

type Props = {
  file: FileMessage;
};

// Voice and video messages have their own player; files get an inline preview for images, video and audio, and a
// download card.
export const FileBubble = ({ file }: Props) => {
  const { name, size, mime, url, transferred, status, from, error, note, packed } = file;
  // `transferred` counts what travels: the zipped bytes when it was sent zipped.
  const total = packed ?? size;
  const percent = total ? Math.round((transferred / total) * 100) : 100;
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

  if (note?.type === NoteType.Voice) {
    return <VoiceBubble file={file} />;
  }

  if (note?.type === NoteType.Video) {
    return <VideoNoteBubble file={file} />;
  }

  return (
    <div className={styles.file}>
      {preview()}
      <div className={styles.row}>
        <Icon name="file" size={22} />
        <div className={styles.info}>
          <span className={styles.name} title={name}>{name}</span>
          <span className={styles.meta}>
            {status === FileStatus.Transferring && `${verb}… ${percent}% · `}
            {status === FileStatus.Failed && (
              <span className={styles.failed}>
                {error ?? 'Failed'}
                {' '}
                ·
                {' '}
              </span>
            )}
            {formatBytes(size)}
            {packed !== undefined && ` · sent zipped, ${formatBytes(packed)}`}
          </span>
        </div>
        {status === FileStatus.Done && url && (
          <a className={styles.download} href={url} download={name} title="Download" aria-label="Download">
            <Icon name="download" />
          </a>
        )}
      </div>
      {status === FileStatus.Transferring && (
        <div className={styles.progress}>
          <div className={styles.bar} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
};
