import { useEffect, useState } from 'react';
import { sessions } from '../webrtc/state.ts';

type Totals = { sent: number; received: number };

const INTERVAL_MS = 1000;

// Media bytes sent and received per second on `key`'s connection, to see whether a call's audio/video flows.
export const useCallStats = (key: string | null, active: boolean): { sent: number; received: number } | null => {
  const [rate, setRate] = useState<Totals | null>(null);

  useEffect(() => {
    if (!key || !active) {
      return;
    }

    let last: Totals | null = null;

    const tick = async () => {
      const report = await sessions.get(key)?.peer.getStats();

      if (!report) {
        return;
      }

      const now: Totals = { sent: 0, received: 0 };

      report.forEach((stat: { type: string; bytesSent?: number; bytesReceived?: number }) => {
        if (stat.type === 'outbound-rtp') {
          now.sent += stat.bytesSent ?? 0;
        } else if (stat.type === 'inbound-rtp') {
          now.received += stat.bytesReceived ?? 0;
        }
      });

      if (last) {
        setRate({ sent: now.sent - last.sent, received: now.received - last.received });
      }

      last = now;
    };

    const timer = window.setInterval(() => void tick(), INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      setRate(null);
    };
  }, [key, active]);

  return rate;
};
