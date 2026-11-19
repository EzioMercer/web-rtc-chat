import { useEffect, useState } from 'react';
import styles from './CopyButton.module.css';

const COPIED_MS = 1500;

type Props = {
  text: string;
};

export const CopyButton = ({ text }: Props) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <button className={styles.button} type="button" disabled={!text} onClick={copy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};
