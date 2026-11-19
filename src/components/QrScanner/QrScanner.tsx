import { useEffect, useRef, useState } from 'react';
import styles from './QrScanner.module.css';

type Props = {
  onResult: (text: string) => void;
};

const SCAN_MS = 250;

// Reads a QR code with the camera. Everything happens on this device.
export const QrScanner = ({ onResult }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    let decode: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;

    // Loaded only when scanning.
    void import('jsqr').then((module) => {
      decode = module.default;
    });

    const scan = () => {
      const video = videoRef.current;

      if (!video || !context || !decode || video.readyState < 2) {
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const code = decode(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);

      if (code?.data) {
        window.clearInterval(timer);
        onResult(code.data);
      }
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach(track => track.stop());

          return;
        }

        stream = media;

        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }

        timer = window.setInterval(scan, SCAN_MS);
      })
      .catch(() => setError('Could not open the camera.'));

    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onResult]);

  return error
    ? <p className={styles.error}>{error}</p>
    : <video ref={videoRef} className={styles.video} autoPlay playsInline muted />;
};
