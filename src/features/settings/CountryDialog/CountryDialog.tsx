import { useLayoutEffect, useRef, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { flagUrl } from '../../../core/profile/phone/flagUrl.ts';
import { matchesCountry } from '../../../core/profile/phone/matchesCountry.ts';
import type { CountryOption } from '../../../core/profile/phone/types.ts';
import { cx } from '../../../utils/cx.ts';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import styles from './CountryDialog.module.css';

type Props = {
  options: CountryOption[];
  current: CountryCode | null;
  onChoose: (country: CountryCode) => void;
  onClose: () => void;
};

// The phone number's country: a list with a search over names, letters and codes.
export const CountryDialog = ({ options, current, onChoose, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const currentRef = useRef<HTMLButtonElement>(null);
  const shown = options.filter(option => matchesCountry(option, query));

  // The chosen country is in view when the list opens.
  useLayoutEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <Dialog title="Country" onClose={onClose}>
      <TextField label="Search" value={query} onChange={setQuery} placeholder="Country or code (+994)" autoFocus />
      <ul className={styles.list}>
        {shown.map(option => (
          <li key={option.code}>
            <button
              ref={option.code === current ? currentRef : undefined}
              className={cx(styles.option, option.code === current && styles.current)}
              type="button"
              aria-current={option.code === current}
              onClick={() => onChoose(option.code)}
            >
              <img className={styles.flag} src={flagUrl(option.code)} alt="" />
              <span className={styles.name}>{option.name}</span>
              <span className={styles.code}>{option.callingCode}</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className={styles.none}>No country fits that.</li>}
      </ul>
    </Dialog>
  );
};
