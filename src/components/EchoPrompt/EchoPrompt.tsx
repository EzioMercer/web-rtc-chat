import { useEffect } from 'react';
import { echoPromptAnswered } from '../../store/call/callSlice.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import styles from './EchoPrompt.module.css';

// Asks once per call, after the other side told us they hear an echo of themselves. Only its buttons close it (and
// Escape on a computer): a stray tap must not answer it.
export const EchoPrompt = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(echoPromptAnswered(false));
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="echo-prompt-title"
        aria-describedby="echo-prompt-text"
      >
        <h2 id="echo-prompt-title" className={styles.title}>They hear an echo</h2>
        <p id="echo-prompt-text" className={styles.text}>
          The other person hears their own voice back from your device. Turn on echo guard for this call?
        </p>
        <div className={styles.buttons}>
          <button className={styles.no} type="button" onClick={() => dispatch(echoPromptAnswered(false))}>No</button>
          <button
            className={styles.yes}
            type="button"
            // Focused, so Enter turns it on on a computer.
            autoFocus
            onClick={() => dispatch(echoPromptAnswered(true))}
          >
            Turn on
          </button>
        </div>
      </div>
    </div>
  );
};
