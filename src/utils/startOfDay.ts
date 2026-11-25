// Midnight at the start of the day `at` falls on, in the device's own time zone.
export const startOfDay = (at: number): number => new Date(at).setHours(0, 0, 0, 0);
