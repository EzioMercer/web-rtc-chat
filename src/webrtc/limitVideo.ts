import { errorText } from './errorText.ts';
import { TURN_VIDEO_BITRATE } from './config.ts';
import type { Session } from './types.ts';

// Lowers our video quality while the connection goes through the TURN relay, and lifts the limit on a direct path.
export const limitVideo = async (session: Session) => {
  const maxBitrate = session.route === 'relay' ? TURN_VIDEO_BITRATE : undefined;
  const video = session.peer.getSenders().filter(sender => sender.track?.kind === 'video');

  for (const sender of video) {
    const params = sender.getParameters();
    const [encoding] = params.encodings;

    // No encodings until the call is set up; this runs again after each offer/answer.
    if (!encoding || encoding.maxBitrate === maxBitrate) {
      continue;
    }

    if (maxBitrate) {
      encoding.maxBitrate = maxBitrate;
    } else {
      delete encoding.maxBitrate;
    }

    try {
      await sender.setParameters(params);
      session.log(maxBitrate ? 'Lower video quality while on the TURN relay' : 'Full video quality');
    } catch (err) {
      session.log(`Could not change video quality: ${errorText(err)}`);
    }
  }
};
