// The message of something thrown, for the log.
export const errorText = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));
