import { useEffect, useRef } from 'react';

type Props = {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
  // Changes when tracks were added to the same stream, so the element is re-attached.
  version?: number;
  // The picture's shape (width / height), whenever it is known or changes (e.g. a phone is turned).
  onShape?: (ratio: number) => void;
};

// <video> that plays a MediaStream.
export const MediaVideo = ({ stream, className, muted, version, onShape }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attached = useRef<number | undefined>(undefined);

  // Not every browser shows a track added to the stream it already plays (Safari), so the same stream is attached
  // again when `version` changes.
  useEffect(() => {
    const video = videoRef.current;

    if (!video || (video.srcObject === stream && attached.current === version)) {
      return;
    }

    if (video.srcObject === stream) {
      video.srcObject = null;
    }

    video.srcObject = stream;
    attached.current = version;
  }, [stream, version]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !onShape) {
      return;
    }

    const report = () => {
      if (video.videoWidth && video.videoHeight) {
        onShape(video.videoWidth / video.videoHeight);
      }
    };

    report();
    video.addEventListener('loadedmetadata', report);
    video.addEventListener('resize', report);

    return () => {
      video.removeEventListener('loadedmetadata', report);
      video.removeEventListener('resize', report);
    };
  }, [onShape]);

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />;
};
