import { errorText } from './errorText.ts';
import { TURN_VIDEO_BITRATE } from './config.ts';
import type { Session } from './types.ts';

type Change = (encoding: RTCRtpEncodingParameters) => boolean;

// Applies `change` to the sender's settings if it returns true. Returns whether they changed.
const setEncoding = async (session: Session, sender: RTCRtpSender, change: Change) => {
  const params = sender.getParameters();
  const [encoding] = params.encodings;

  // No encodings until the call is set up; this runs again after each offer/answer.
  if (!encoding || !change(encoding)) {
    return false;
  }

  try {
    await sender.setParameters(params);

    return true;
  } catch (err) {
    session.log(`Could not change ${sender.track?.kind ?? 'media'} settings: ${errorText(err)}`);

    return false;
  }
};

// Voice goes first when the network is busy, and video quality is lowered while the connection goes through the
// TURN relay (the limit is lifted on a direct path).
export const tuneSenders = async (session: Session) => {
  const maxBitrate = session.route === 'relay' ? TURN_VIDEO_BITRATE : undefined;

  for (const sender of session.peer.getSenders()) {
    if (sender.track?.kind === 'audio') {
      await setEncoding(session, sender, (encoding) => {
        if (encoding.priority === 'high') {
          return false;
        }

        encoding.priority = 'high';
        encoding.networkPriority = 'high';

        return true;
      });
    } else if (sender.track?.kind === 'video') {
      const changed = await setEncoding(session, sender, (encoding) => {
        if (encoding.maxBitrate === maxBitrate) {
          return false;
        }

        if (maxBitrate) {
          encoding.maxBitrate = maxBitrate;
        } else {
          delete encoding.maxBitrate;
        }

        return true;
      });

      if (changed) {
        session.log(maxBitrate ? 'Lower video quality while on the TURN relay' : 'Full video quality');
      }
    }
  }
};
