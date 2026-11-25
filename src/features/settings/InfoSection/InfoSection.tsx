import { useId, useMemo, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { MAX_ABOUT_CHARS } from '../../../core/profile/config.ts';
import { fitPhone } from '../../../core/profile/phone/fitPhone.ts';
import { countryOptions } from '../../../core/profile/phone/countryOptions.ts';
import { guessCountry } from '../../../core/profile/phone/guessCountry.ts';
import { splitPhone } from '../../../core/profile/phone/splitPhone.ts';
import { setInfo } from '../../../store/thunks/profile/setInfo.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { cx } from '../../../utils/cx.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { BirthdayField } from '../BirthdayField/BirthdayField.tsx';
import { CountryDialog } from '../CountryDialog/CountryDialog.tsx';
import { PhoneField } from '../PhoneField/PhoneField.tsx';
import settingsStyles from '../SettingsDialog/SettingsDialog.module.css';
import { checkBirthday } from './checkBirthday.ts';
import { checkPhoneField } from './checkPhoneField.ts';
import styles from './InfoSection.module.css';

// A saved birthday as the form shows it: day, month and year as text, '' where there is none.
const splitBirthday = (birthday: string) => {
  const [, year = '', month = '', day = ''] = /^(\d{4}|-)-(\d{2})-(\d{2})$/.exec(birthday) ?? [];

  return { day: day && String(Number(day)), month: month && String(Number(month)), year: year === '-' ? '' : year };
};

type Props = {
  // Our picture is being made or sent: Save waits for it.
  busy: boolean;
};

// Our phone number, description and birthday, which every contact sees: typed here and sent with Save. Each is checked
// as it is typed, and Save is off until all of them can be saved.
export const InfoSection = ({ busy }: Props) => {
  const dispatch = useAppDispatch();
  const saved = useAppSelector(state => state.profile);
  const languages = navigator.languages;
  const options = useMemo(() => countryOptions(languages), [languages]);
  const guess = useMemo(() => guessCountry(languages), [languages]);
  // What is saved now, as the form shows it: the country (ours, or the guess) and the digits after its code.
  const initial = useMemo(() => {
    const split = saved.phone ? splitPhone(saved.phone, guess) : null;

    return {
      country: split?.country ?? guess,
      digits: split?.digits ?? '',
      about: saved.about,
      ...splitBirthday(saved.birthday),
    };
  }, [saved.phone, saved.about, saved.birthday, guess]);
  const [country, setCountry] = useState<CountryCode | null>(initial.country);
  const [digits, setDigits] = useState(initial.digits);
  const [about, setAbout] = useState(initial.about);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState(false);
  const aboutId = useId();
  const option = options.find(o => o.code === country) ?? null;
  const changed = digits !== initial.digits
    || about !== initial.about
    || day !== initial.day
    || month !== initial.month
    || year !== initial.year
    || (Boolean(digits) && country !== initial.country);
  const phone = checkPhoneField(option, digits);
  const birthday = checkBirthday(day, month, year, new Date());
  const tooLong = about.length > MAX_ABOUT_CHARS;
  const ready = changed && !busy && !tooLong && 'phone' in phone && 'birthday' in birthday;

  // Any edit: "Saved" no longer applies.
  const edit = (apply: () => void) => {
    apply();
    setDone(false);
  };

  const save = async () => {
    if (!ready) {
      return;
    }

    await dispatch(setInfo({ phone: phone.phone, about: about.trim(), birthday: birthday.birthday }));

    // Shown as saved ("09" becomes "9"), so the form doesn't look changed.
    const shown = splitBirthday(birthday.birthday);

    setAbout(about.trim());
    setDay(shown.day);
    setMonth(shown.month);
    setYear(shown.year);
    setDone(true);
  };

  return (
    <section className={settingsStyles.section}>
      <PhoneField
        country={option}
        digits={digits}
        onDigits={value => edit(() => setDigits(value))}
        onCountry={value => edit(() => setCountry(value))}
        onPickCountry={() => setPicking(true)}
      />
      {'missing' in phone && <p>{phone.missing}</p>}
      {'error' in phone && <p className={settingsStyles.warn}>{phone.error}</p>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor={aboutId}>Description</label>
        <textarea
          id={aboutId}
          className={styles.about}
          value={about}
          rows={3}
          maxLength={MAX_ABOUT_CHARS}
          placeholder="A few words about you"
          onChange={e => edit(() => setAbout(e.target.value))}
        />
        <span className={cx(styles.count, tooLong && styles.over)}>{`${about.length}/${MAX_ABOUT_CHARS}`}</span>
      </div>
      <BirthdayField
        day={day}
        month={month}
        year={year}
        onDay={value => edit(() => setDay(value))}
        onMonth={value => edit(() => setMonth(value))}
        onYear={value => edit(() => setYear(value))}
      />
      {'missing' in birthday && <p>{birthday.missing}</p>}
      {'error' in birthday && <p className={settingsStyles.warn}>{birthday.error}</p>}
      {done && !changed && <p>Saved.</p>}
      <div className={settingsStyles.buttons}>
        <Button disabled={!ready} onClick={() => void save()}>Save</Button>
      </div>
      {picking && (
        <CountryDialog
          options={options}
          current={country}
          onChoose={(code) => {
            edit(() => {
              setCountry(code);
              setDigits(fitPhone(code, digits));
            });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
};
