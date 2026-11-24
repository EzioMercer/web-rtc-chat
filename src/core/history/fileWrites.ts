let queue: Promise<unknown> = Promise.resolve();

// Saving and deleting files' pieces run one after another, so a file deleted while it is still being saved loses
// every piece: the delete runs once the save is done.
export const fileWrites = <T>(job: () => Promise<T>): Promise<T> => {
  const next = queue.then(job);

  queue = next.catch(() => undefined);

  return next;
};
