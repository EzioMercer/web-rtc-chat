import { useEffect, useState } from 'react';
import { sessions } from '../../core/webrtc/state.ts';

type Totals = { sent: number; received: number; audioLost: number; audioReceived: number };

export type CallStats = {
  sent: number;
  received: number;
  // Share of their audio packets lost on the way in the last second (0 to 1). Lost audio sounds choppy or noisy.
  audioLoss: number;
};

type Stat = {
  type: string;
  kind?: string;
  bytesSent?: number;
  bytesReceived?: number;
  packetsLost?: number;
  packetsReceived?: number;
};

const INTERVAL_MS = 1000;

// Media bytes sent and received per second on `key`'s connection, to see whether a call's audio/video flows.
export const useCallStats = (key: string | null, active: boolean): CallStats | null => {
  const [rate, setRate] = useState<CallStats | null>(null);

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

      const now: Totals = { sent: 0, received: 0, audioLost: 0, audioReceived: 0 };

      report.forEach((stat: Stat) => {
        if (stat.type === 'outbound-rtp') {
          now.sent += stat.bytesSent ?? 0;
        } else if (stat.type === 'inbound-rtp') {
          now.received += stat.bytesReceived ?? 0;

          if (stat.kind === 'audio') {
            now.audioLost += stat.packetsLost ?? 0;
            now.audioReceived += stat.packetsReceived ?? 0;
          }
        }
      });

      if (last) {
        const lost = Math.max(now.audioLost - last.audioLost, 0);
        const total = lost + now.audioReceived - last.audioReceived;

        const audioLoss = total ? lost / total : 0;

        setRate({ sent: now.sent - last.sent, received: now.received - last.received, audioLoss });
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
