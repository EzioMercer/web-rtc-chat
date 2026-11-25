import { isAbout } from '../profile/isAbout.ts';
import { isBirthday } from '../profile/isBirthday.ts';
import { isPhone } from '../profile/isPhone.ts';
import { isPicture } from '../profile/isPicture.ts';
import type { Contact } from '../../store/contacts/types.ts';

const isText = (value: unknown) => typeof value === 'string';

// A contact from a backup has every field a contact needs, and an id that is safe to use in storage keys.
export const validContact = (contact: unknown): contact is Contact => {
  const c = contact as Partial<Contact> | null;

  return Boolean(c)
    && typeof c?.id === 'string' && /^[\w-]{1,64}$/.test(c.id)
    && isText(c.name) && isText(c.safety) && isText(c.identity) && isText(c.myKey) && isText(c.sendSecret)
    && typeof c.favourite === 'boolean' && typeof c.verified === 'boolean'
    && Array.isArray(c.secrets) && c.secrets.every(isText)
    && (c.picture === undefined || isPicture(c.picture))
    && (c.phone === undefined || isPhone(c.phone))
    && (c.about === undefined || isAbout(c.about))
    && (c.birthday === undefined || isBirthday(c.birthday))
    && (c.lastConnected === null || (Number.isSafeInteger(c.lastConnected) && Number(c.lastConnected) >= 0));
};
