import { useId, type ReactNode } from 'react';
import styles from './CodeField.module.css';

type Props = {
  label: string;
  value: string;
  placeholder: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  action?: ReactNode;
};

export const CodeField = ({ label, value, placeholder, readOnly, onChange, action }: Props) => {
  const id = useId();

  return (
    <div className={styles.field}>
      <div className={styles.label}>
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <textarea
        id={id}
        className={styles.textarea}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        onChange={e => onChange?.(e.target.value)}
      />
    </div>
  );
};
