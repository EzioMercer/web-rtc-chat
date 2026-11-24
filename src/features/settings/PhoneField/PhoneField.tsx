import { useId, useLayoutEffect, useRef, type ChangeEvent } from 'react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { flagUrl } from '../../../core/profile/phone/flagUrl.ts';
import { formatPhone } from '../../../core/profile/phone/formatPhone.ts';
import { splitPhone } from '../../../core/profile/phone/splitPhone.ts';
import type { CountryOption } from '../../../core/profile/phone/types.ts';
import { MAX_PHONE_DIGITS } from '../../../core/profile/config.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './PhoneField.module.css';

type Props = {
  country: CountryOption | null;
  // What was typed after the country code, digits only.
  digits: string;
  onDigits: (digits: string) => void;
  onCountry: (country: CountryCode) => void;
  // Opens the country list.
  onPickCountry: () => void;
};

// The place in `text` just after its `count`th digit.
const afterDigits = (text: string, count: number) => {
  let seen = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (seen === count) {
      return i;
    }

    if (/\d/.test(text[i])) {
      seen += 1;
    }
  }

  return text.length;
};

// A phone number: its country (a button that opens the list) and the rest, spaced as that country writes it while
// typing. A number pasted with its "+" and code picks its country by itself.
export const PhoneField = ({ country, digits, onDigits, onCountry, onPickCountry }: Props) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // How many digits were before the caret, to put it back there once the spacing changes.
  const caret = useRef<number | null>(null);
  const shown = country ? formatPhone(country.code, digits) : digits;

  useLayoutEffect(() => {
    const input = inputRef.current;

    if (input && caret.current !== null && document.activeElement === input) {
      const at = afterDigits(shown, caret.current);

      input.setSelectionRange(at, at);
    }

    caret.current = null;
  }, [shown]);

  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;

    if (text.includes('+')) {
      const split = splitPhone(text, country?.code ?? null);

      if (split) {
        onCountry(split.country);
        onDigits(split.digits.slice(0, MAX_PHONE_DIGITS));

        return;
      }
    }

    caret.current = text.slice(0, e.target.selectionStart ?? text.length).replace(/\D/g, '').length;
    onDigits(text.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS));
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>Phone number</label>
      <div className={styles.row}>
        <button
          className={styles.country}
          type="button"
          aria-label={country ? `Country: ${country.name}` : 'Choose country'}
          onClick={onPickCountry}
        >
          {country
            ? (
                <>
                  <img className={styles.flag} src={flagUrl(country.code)} alt="" />
                  <span>{country.callingCode}</span>
                </>
              )
            : <span>Country</span>}
          <Icon name="chevronDown" size={16} />
        </button>
        <input
          ref={inputRef}
          id={id}
          className={styles.input}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Mobile number"
          value={shown}
          onChange={change}
        />
      </div>
    </div>
  );
};
