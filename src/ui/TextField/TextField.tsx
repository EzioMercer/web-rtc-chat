import { useId, type ReactNode } from 'react';
import styles from './TextField.module.css';
import { TextFieldType } from './TextFieldType.ts';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: TextFieldType;
  placeholder?: string;
  autoFocus?: boolean;
  hint?: ReactNode;
  action?: ReactNode;
};

export const TextField = (
  { label, value, onChange, type = TextFieldType.Text, placeholder, autoFocus, hint, action }: Props,
) => {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.row}>
        <input
          id={id}
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          onChange={e => onChange(e.target.value)}
        />
        {action}
      </div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
};
