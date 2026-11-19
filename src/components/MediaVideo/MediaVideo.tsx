import { useEffect, useRef } from 'react';

type Props = {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
  // Changes when tracks were added to the same stream, so the element is re-attached.
  version?: number;
};

// <video> that plays a MediaStream.
export const MediaVideo = ({ stream, className, muted, version }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }, [stream, version]);

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />;
};
