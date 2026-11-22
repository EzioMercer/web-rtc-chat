import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import styles from './QrCode.module.css';

type Props = {
  text: string;
};

export const QrCode = ({ text }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, text, { width: 240, margin: 2, errorCorrectionLevel: 'M' });
    }
  }, [text]);

  return <canvas ref={canvasRef} className={styles.qr} aria-label="Invite QR code" />;
};
