// Resolves when the channel's send buffer drops below its `bufferedAmountLowThreshold`.
export const waitForDrain = (channel: RTCDataChannel): Promise<void> => new Promise((resolve, reject) => {
  const cleanup = () => {
    channel.removeEventListener('bufferedamountlow', onLow);
    channel.removeEventListener('close', onClose);
  };

  const onLow = () => {
    cleanup();
    resolve();
  };

  const onClose = () => {
    cleanup();
    reject(new Error('Channel closed'));
  };

  channel.addEventListener('bufferedamountlow', onLow);
  channel.addEventListener('close', onClose);
});
