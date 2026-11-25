import { useId, useMemo } from 'react';
import { Select } from '../../../ui/Select/Select.tsx';
import styles from './BirthdayField.module.css';

type Props = {
  // As typed or chosen, '' for none: the day ("1" to "31"), the month ("1" to "12") and the year.
  day: string;
  month: string;
  year: string;
  onDay: (day: string) => void;
  onMonth: (month: string) => void;
  onYear: (year: string) => void;
};

// Only digits are kept from what is typed or pasted, at most `count` of them.
const digitsOf = (text: string, count: number) => text.replace(/\D/g, '').slice(0, count);

// Our birthday, as birthdays are asked for in government forms (GOV.UK, USWDS): the day and year typed (a number
// keyboard on phones), the month chosen by name so day and month can't be mixed up, each with its own label. The year
// is optional: some would rather not say it.
export const BirthdayField = ({ day, month, year, onDay, onMonth, onYear }: Props) => {
  const id = useId();
  // The months' names in the device's language.
  const months = useMemo(() => {
    const format = new Intl.DateTimeFormat([], { month: 'long', timeZone: 'UTC' });

    return Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: format.format(Date.UTC(2000, i, 1)) }));
  }, []);

  return (
    <div className={styles.field} role="group" aria-labelledby={`${id}-birthday`}>
      <span id={`${id}-birthday`} className={styles.label}>Birthday</span>
      <div className={styles.row}>
        <div className={styles.part}>
          <label className={styles.small} htmlFor={`${id}-day`}>Day</label>
          <input
            id={`${id}-day`}
            className={styles.day}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={day}
            onChange={e => onDay(digitsOf(e.target.value, 2))}
          />
        </div>
        <div className={styles.part}>
          <span className={styles.small} aria-hidden="true">Month</span>
          <Select label="Month" placeholder="Choose" value={month} options={months} onChange={onMonth} />
        </div>
        <div className={styles.year}>
          <label className={styles.small} htmlFor={`${id}-year`}>Year</label>
          <input
            id={`${id}-year`}
            className={styles.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Optional"
            value={year}
            onChange={e => onYear(digitsOf(e.target.value, 4))}
          />
        </div>
      </div>
    </div>
  );
};
