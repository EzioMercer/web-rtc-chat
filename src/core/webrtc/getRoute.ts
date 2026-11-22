import { SessionRoute } from '../../store/sessions/types.ts';

type Stat = {
  type: string;
  selectedCandidatePairId?: string;
  localCandidateId?: string;
  remoteCandidateId?: string;
  candidateType?: string;
  nominated?: boolean;
  selected?: boolean;
  state?: string;
};

// Whether the open connection goes straight between the devices or through the TURN relay.
export const getRoute = async (peer: RTCPeerConnection): Promise<SessionRoute> => {
  const report = await peer.getStats();
  const stats = [...report.values()] as Stat[];
  const pairId = stats.find(s => s.type === 'transport' && s.selectedCandidatePairId)?.selectedCandidatePairId;

  // Firefox has no selectedCandidatePairId; it marks the pair instead.
  const pair = (pairId ? report.get(pairId) as Stat : undefined)
    ?? stats.find(s => s.type === 'candidate-pair' && (s.selected || (s.nominated && s.state === 'succeeded')));

  const types = [pair?.localCandidateId, pair?.remoteCandidateId]
    .map(id => (id ? (report.get(id) as Stat | undefined)?.candidateType : undefined));

  return types.includes('relay') ? SessionRoute.Relay : SessionRoute.Direct;
};
