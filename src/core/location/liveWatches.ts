// Our live locations being shared now, by message id: the browser's position watch and the heartbeat timer.
// Gone after a reload, which ends them (see fromStored).
export const liveWatches = new Map<string, { key: string; watch: number; timer: number }>();
