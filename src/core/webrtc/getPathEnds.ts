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

// What each end of the open connection's path is ('host', 'srflx', 'prflx' or 'relay': the TURN relay); null while
// the browser has no path chosen (e.g. during a path search).
export const getPathEnds = async (peer: RTCPeerConnection): Promise<{ ours: string; theirs: string } | null> => {
  const report = await peer.getStats();
  const stats = [...report.values()] as Stat[];
  const pairId = stats.find(s => s.type === 'transport' && s.selectedCandidatePairId)?.selectedCandidatePairId;

  // Firefox has no selectedCandidatePairId; it marks the pair instead.
  const pair = (pairId ? report.get(pairId) as Stat : undefined)
    ?? stats.find(s => s.type === 'candidate-pair' && (s.selected || (s.nominated && s.state === 'succeeded')));

  if (!pair) {
    return null;
  }

  const type = (id?: string) => (id ? (report.get(id) as Stat | undefined)?.candidateType : undefined) ?? 'unknown';

  return { ours: type(pair.localCandidateId), theirs: type(pair.remoteCandidateId) };
};
