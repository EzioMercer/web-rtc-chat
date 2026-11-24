import { useId, useMemo, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { MAX_ABOUT_CHARS } from '../../../core/profile/config.ts';
import { checkPhone } from '../../../core/profile/phone/checkPhone.ts';
import { countryOptions } from '../../../core/profile/phone/countryOptions.ts';
import { guessCountry } from '../../../core/profile/phone/guessCountry.ts';
import { splitPhone } from '../../../core/profile/phone/splitPhone.ts';
import { setInfo } from '../../../store/thunks/profile/setInfo.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { CountryDialog } from '../CountryDialog/CountryDialog.tsx';
import { PhoneField } from '../PhoneField/PhoneField.tsx';
import settingsStyles from '../SettingsDialog/SettingsDialog.module.css';
import styles from './InfoSection.module.css';

// Our phone number and description, which every contact sees: typed here and sent with Save.
export const InfoSection = () => {
  const dispatch = useAppDispatch();
  const saved = useAppSelector(state => state.profile);
  const languages = navigator.languages;
  const options = useMemo(() => countryOptions(languages), [languages]);
  const guess = useMemo(() => guessCountry(languages), [languages]);
  // What is saved now, as the form shows it: the country (ours, or the guess) and the digits after its code.
  const initial = useMemo(() => {
    const split = saved.phone ? splitPhone(saved.phone, guess) : null;

    return { country: split?.country ?? guess, digits: split?.digits ?? '', about: saved.about };
  }, [saved.phone, saved.about, guess]);
  const [country, setCountry] = useState<CountryCode | null>(initial.country);
  const [digits, setDigits] = useState(initial.digits);
  const [about, setAbout] = useState(initial.about);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const aboutId = useId();
  const option = options.find(o => o.code === country) ?? null;
  const changed = digits !== initial.digits
    || about !== initial.about
    || (Boolean(digits) && country !== initial.country);

  // Any edit: the last error or "Saved" no longer applies.
  const edit = (apply: () => void) => {
    apply();
    setError('');
    setDone(false);
  };

  const save = async () => {
    let phone = '';

    if (digits) {
      if (!option) {
        setError('Choose the country of your phone number.');

        return;
      }

      phone = checkPhone(option.code, digits) ?? '';

      if (!phone) {
        setError(`This isn't a mobile number of ${option.name} (${option.callingCode}).`);

        return;
      }
    }

    await dispatch(setInfo({ phone, about: about.trim() }));
    setAbout(about.trim());
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
        <span className={styles.count}>{`${about.length}/${MAX_ABOUT_CHARS}`}</span>
      </div>
      {error && <p className={settingsStyles.warn}>{error}</p>}
      {done && !changed && <p>Saved.</p>}
      <div className={settingsStyles.buttons}>
        <Button disabled={!changed} onClick={() => void save()}>Save</Button>
      </div>
      {picking && (
        <CountryDialog
          options={options}
          current={country}
          onChoose={(code) => {
            edit(() => setCountry(code));
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
};
