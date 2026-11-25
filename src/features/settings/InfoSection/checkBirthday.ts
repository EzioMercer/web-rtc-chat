import { MIN_BIRTH_YEAR } from '../../../core/profile/config.ts';
import { isBirthday } from '../../../core/profile/isBirthday.ts';

// What the birthday fields hold: the birthday to save ('' for none), a part still to fill in (`missing`, said
// quietly), or a mistake (`error`). Checked as they change, so Save is off until it can be saved.
export type BirthdayCheck = { birthday: string } | { missing: string } | { error: string };

const twoDigits = (value: string) => value.padStart(2, '0');

// The birthday typed (see isBirthday): the day and month needed, the year optional, no day after today.
export const checkBirthday = (day: string, month: string, year: string, today: Date): BirthdayCheck => {
  if (!day && !month && !year) {
    return { birthday: '' };
  }

  if (!day || !month) {
    return { missing: 'Type the day and choose the month of your birthday.' };
  }

  if (year && year.length < 4) {
    return { missing: 'Type the year with 4 digits, or leave it empty.' };
  }

  const thisYear = today.getFullYear();

  if (year && (Number(year) < MIN_BIRTH_YEAR || Number(year) > thisYear)) {
    return { error: `The year should be from ${MIN_BIRTH_YEAR} to ${thisYear}.` };
  }

  // The day as typed may have a leading 0 ("05"), or be 0.
  const birthday = `${year || '-'}-${twoDigits(month)}-${twoDigits(String(Number(day)))}`;

  if (!isBirthday(birthday)) {
    return { error: 'There is no such date.' };
  }

  // In this year, a day still to come hasn't been anyone's birthday yet.
  if (year && new Date(Number(year), Number(month) - 1, Number(day)) > today) {
    return { error: 'This day hasn\'t come yet.' };
  }

  return { birthday };
};
