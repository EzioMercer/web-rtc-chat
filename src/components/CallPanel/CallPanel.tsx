import { acceptCall } from '../../store/thunks/call/acceptCall.ts';
import { declineCall } from '../../store/thunks/call/declineCall.ts';
import { hangUp } from '../../store/thunks/call/hangUp.ts';
import { toggleCam } from '../../store/thunks/call/toggleCam.ts';
import { toggleMic } from '../../store/thunks/call/toggleMic.ts';
import { canShareScreen, toggleScreen } from '../../store/thunks/call/toggleScreen.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCallStats } from '../../hooks/useCallStats.ts';
import { useEchoDetector } from '../../hooks/useEchoDetector.ts';
import { useEchoGuard } from '../../hooks/useEchoGuard.ts';
import { useFullScreen } from '../../hooks/useFullScreen.ts';
import { echoGuardToggled } from '../../store/call/callSlice.ts';
import { cx } from '../../utils/cx.ts';
import { formatBytes } from '../../utils/formatBytes.ts';
import { media, sessions } from '../../webrtc/state.ts';
import { Icon } from '../Icon/Icon.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { CallStage } from '../CallStage/CallStage.tsx';
import { EchoPrompt } from '../EchoPrompt/EchoPrompt.tsx';
import styles from './CallPanel.module.css';

const TITLES = {
  incoming: 'Incoming',
  outgoing: 'Calling…',
  active: '',
  idle: '',
};

// Show a warning when this share of their audio is lost on the way.
const AUDIO_LOSS_WARNING = 0.03;

// In full screen, the buttons hide after this long; a tap on the video shows them again.
const CONTROLS_HIDE_MS = 3000;

// In full screen the buttons float over the bottom of the video; the small picture stays above them.
const FULL_BOTTOM_PX = 130;

// Mouse movement restarts the hide timer at most this often.
const MOVE_THROTTLE_MS = 300;

export const CallPanel = () => {
  const dispatch = useAppDispatch();
  const panelRef = useRef<HTMLDivElement>(null);
  const { full, toggleFull } = useFullScreen(panelRef);
  const call = useAppSelector(state => state.call);
  const { status, video, ownVideo, mic, cam, remoteMic, remoteCam, remoteStreamVersion, key } = call;
  const { screen, remoteScreen, echoGuard, echoPrompt } = call;
  const remoteStream = key ? sessions.get(key)?.remoteStream ?? null : null;
  const stats = useCallStats(key, status === 'active');

  useEchoGuard(key, status === 'active' && echoGuard && mic);
  useEchoDetector(key, status === 'active');

  const [controlsShown, setControlsShown] = useState(true);
  const hideTimer = useRef(0);
  const movedAt = useRef(0);

  // Shows the buttons, and hides them again a little later (only full screen ever hides them). Any press on the
  // buttons, including the one that enters full screen, calls this.
  const showControls = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setControlsShown(true);
    hideTimer.current = window.setTimeout(() => setControlsShown(false), CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  if (status === 'idle') {
    return null;
  }

  const active = status === 'active';
  const showRemoteVideo = active && ((video && remoteCam) || remoteScreen);
  const showLocalVideo = screen || (ownVideo && cam && status !== 'incoming');
  const videoStage = video || screen || remoteScreen;
  const hidden = full && !controlsShown;
  const kind = video ? 'video' : 'audio';
  const nothing = stats?.received === 0;
  const lossy = (stats?.audioLoss ?? 0) >= AUDIO_LOSS_WARNING;

  return (
    <div
      ref={panelRef}
      className={cx(styles.panel, full && styles.full, hidden && styles.noCursor)}
      // With a mouse, moving it shows the buttons (and the pointer) for a while.
      onPointerMove={(e) => {
        if (full && e.pointerType === 'mouse' && e.timeStamp - movedAt.current > MOVE_THROTTLE_MS) {
          movedAt.current = e.timeStamp;
          showControls();
        }
      }}
    >
      <div className={cx(styles.stage, !videoStage && styles.audioStage)}>
        {/* Mounted for the whole call: it also plays the peer's audio. */}
        {active && (
          <CallStage
            remoteStream={remoteStream}
            remoteVersion={remoteStreamVersion}
            showRemote={showRemoteVideo}
            localStream={screen ? media.screen?.stream ?? null : media.localStream}
            showLocal={showLocalVideo}
            mirrorLocal={!screen}
            bottomInset={full ? FULL_BOTTOM_PX : 10}
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
        {screen && <span className={cx(styles.badge, styles.sharing)}>You are sharing your screen</span>}
        {/* In full screen, a tap on the video shows or hides the buttons (the small picture is above it). A mouse
            shows them by moving instead. */}
        {full && (
          <div
            className={styles.stageTap}
            onPointerUp={(e) => {
              if (e.pointerType === 'mouse') {
                return;
              }

              if (controlsShown) {
                window.clearTimeout(hideTimer.current);
                setControlsShown(false);
              } else {
                showControls();
              }
            }}
          />
        )}
      </div>

      <div className={cx(styles.bottom, hidden && styles.bottomHidden)} onPointerDown={showControls}>
        {stats && (
          <span className={cx(styles.stats, (nothing || lossy) && styles.statsBad)} aria-label="Call traffic">
            {`Sending ${formatBytes(stats.sent)}/s · receiving ${formatBytes(stats.received)}/s`}
            {nothing && stats.sent > 0 && ' · nothing is arriving from them'}
            {lossy && ` · ${Math.round(stats.audioLoss * 100)}% of their audio lost (bad network)`}
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
                  <IconButton
                    icon="echo"
                    label={echoGuard ? 'Turn echo guard off' : 'Turn echo guard on'}
                    variant={echoGuard ? 'success' : 'neutral'}
                    onClick={() => dispatch(echoGuardToggled())}
                  />
                  {ownVideo && (
                    <IconButton
                      icon={cam ? 'video' : 'videoOff'}
                      label={cam ? 'Turn camera off' : 'Turn camera on'}
                      variant={cam ? 'neutral' : 'off'}
                      onClick={() => dispatch(toggleCam())}
                    />
                  )}
                  {canShareScreen() && (
                    <IconButton
                      icon="screen"
                      label={screen ? 'Stop sharing your screen' : 'Share your screen'}
                      variant={screen ? 'success' : 'neutral'}
                      onClick={() => void dispatch(toggleScreen())}
                    />
                  )}
                  {videoStage && (
                    <IconButton
                      icon={full ? 'minimize' : 'maximize'}
                      label={full ? 'Exit full screen' : 'Full screen'}
                      variant="neutral"
                      onClick={toggleFull}
                    />
                  )}
                  <IconButton icon="hangUp" label="Hang up" variant="danger" onClick={() => dispatch(hangUp())} />
                </>
              )}
        </div>
      </div>
      {/* Inside the panel, so it also shows in full screen. */}
      {echoPrompt === 'open' && <EchoPrompt />}
    </div>
  );
};
