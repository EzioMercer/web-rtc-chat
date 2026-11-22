import { useRef } from 'react';
import { cx } from '../../utils/cx.ts';
import styles from './SegmentedControl.module.css';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  // Names the group for screen readers (e.g. the id of the heading next to it).
  labelledBy: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// One choice out of a few, as joined buttons (like iOS). Arrow keys move between them, like radio buttons.
export const SegmentedControl = <T extends string>({ labelledBy, options, value, onChange }: Props<T>) => {
  const groupRef = useRef<HTMLDivElement>(null);

  const move = (step: number) => {
    const index = options.findIndex(option => option.value === value);
    const next = (index + step + options.length) % options.length;

    onChange(options[next].value);
    groupRef.current?.querySelectorAll('button')[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      className={styles.control}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map(option => (
        <button
          key={option.value}
          className={cx(styles.segment, option.value === value && styles.selected)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          // Only the chosen one is in the Tab order; arrows move inside the group.
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
