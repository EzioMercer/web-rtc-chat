import type { EchoGuardSetting } from '../store/settings/types.ts';
import { isEchoProne } from './isEchoProne.ts';

// Whether a new call starts with the echo guard on.
export const echoGuardFor = (setting: EchoGuardSetting): boolean => (
  setting === 'auto' ? isEchoProne() : setting === 'on'
);
