import { acceptCall } from '../../store/thunks/call/acceptCall.ts';
import { declineCall } from '../../store/thunks/call/declineCall.ts';
import { hangUp } from '../../store/thunks/call/hangUp.ts';
import { toggleCam } from '../../store/thunks/call/toggleCam.ts';
import { toggleMic } from '../../store/thunks/call/toggleMic.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { rtc } from '../../webrtc/state.ts';
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
  const { status, video, mic, cam, remoteMic, remoteCam, remoteStreamVersion } = call;

  if (status === 'idle') {
    return null;
  }

  const active = status === 'active';
  const showRemoteVideo = active && video && remoteCam;
  const showLocalVideo = video && cam && status !== 'incoming';
  const kind = video ? 'video' : 'audio';

  return (
    <div className={styles.panel}>
      <div className={cx(styles.stage, !video && styles.audioStage)}>
        {/* Always mounted while active: it also plays the peer's audio. */}
        {active && (
          <MediaVideo
            stream={rtc.remoteStream}
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
        {showLocalVideo && <MediaVideo stream={rtc.localStream} className={styles.local} muted />}
      </div>

      <div className={styles.controls}>
        {status === 'incoming'
          ? (
              <>
                <IconButton icon="hangUp" label="Decline" variant="danger" onClick={() => dispatch(declineCall())} />
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
                {video && (
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
