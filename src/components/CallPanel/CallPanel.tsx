import { acceptCall } from '../../store/thunks/call/acceptCall.ts';
import { declineCall } from '../../store/thunks/call/declineCall.ts';
import { hangUp } from '../../store/thunks/call/hangUp.ts';
import { toggleCam } from '../../store/thunks/call/toggleCam.ts';
import { toggleMic } from '../../store/thunks/call/toggleMic.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { useCallStats } from '../../hooks/useCallStats.ts';
import { cx } from '../../utils/cx.ts';
import { formatBytes } from '../../utils/formatBytes.ts';
import { media, sessions } from '../../webrtc/state.ts';
import { Icon } from '../Icon/Icon.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { MediaVideo } from '../MediaVideo/MediaVideo.tsx';
import styles from './CallPanel.module.css';

const TITLES = {
  incoming: 'Incoming',
  outgoing: 'Calling…',
  active: '',
  idle: '',
};

export const CallPanel = () => {
  const dispatch = useAppDispatch();
  const call = useAppSelector(state => state.call);
  const { status, video, ownVideo, mic, cam, remoteMic, remoteCam, remoteStreamVersion, key } = call;
  const remoteStream = key ? sessions.get(key)?.remoteStream ?? null : null;
  const stats = useCallStats(key, status === 'active');

  if (status === 'idle') {
    return null;
  }

  const active = status === 'active';
  const showRemoteVideo = active && video && remoteCam;
  const showLocalVideo = ownVideo && cam && status !== 'incoming';
  const kind = video ? 'video' : 'audio';

  return (
    <div className={styles.panel}>
      <div className={cx(styles.stage, !video && styles.audioStage)}>
        {/* Always mounted while active: it also plays the peer's audio. */}
        {active && (
          <MediaVideo
            stream={remoteStream}
            version={remoteStreamVersion}
            className={cx(styles.remote, !showRemoteVideo && styles.hidden)}
          />
        )}
        {!showRemoteVideo && (
          <div className={styles.placeholder}>
            <span className={styles.avatar}><Icon name="user" size={36} /></span>
            {status === 'incoming' && <span>{`${TITLES.incoming} ${kind} call`}</span>}
            {status === 'outgoing' && <span>{TITLES.outgoing}</span>}
          </div>
        )}
        {active && !remoteMic && (
          <span className={styles.badge}>
            <Icon name="micOff" size={14} />
            Peer is muted
          </span>
        )}
        {showLocalVideo && <MediaVideo stream={media.localStream} className={styles.local} muted />}
      </div>

      {stats && (
        <span className={cx(styles.stats, stats.received === 0 && styles.statsBad)} aria-label="Call traffic">
          {`Sending ${formatBytes(stats.sent)}/s · receiving ${formatBytes(stats.received)}/s`}
          {stats.received === 0 && stats.sent > 0 && ' · nothing is arriving from them'}
        </span>
      )}
      <div className={styles.controls}>
        {status === 'incoming'
          ? (
              <>
                <IconButton icon="hangUp" label="Decline" variant="danger" onClick={() => dispatch(declineCall())} />
                {video && (
                  <IconButton
                    icon="phone"
                    label="Accept with audio only"
                    variant="success"
                    onClick={() => dispatch(acceptCall(true))}
                  />
                )}
                <IconButton
                  icon={video ? 'video' : 'phone'}
                  label="Accept"
                  variant="success"
                  onClick={() => dispatch(acceptCall())}
                />
              </>
            )
          : (
              <>
                <IconButton
                  icon={mic ? 'mic' : 'micOff'}
                  label={mic ? 'Mute' : 'Unmute'}
                  variant={mic ? 'neutral' : 'off'}
                  onClick={() => dispatch(toggleMic())}
                />
                {ownVideo && (
                  <IconButton
                    icon={cam ? 'video' : 'videoOff'}
                    label={cam ? 'Turn camera off' : 'Turn camera on'}
                    variant={cam ? 'neutral' : 'off'}
                    onClick={() => dispatch(toggleCam())}
                  />
                )}
                <IconButton icon="hangUp" label="Hang up" variant="danger" onClick={() => dispatch(hangUp())} />
              </>
            )}
      </div>
    </div>
  );
};
