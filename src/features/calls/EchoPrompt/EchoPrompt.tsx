import { echoPromptAnswered } from '../../../store/call/callSlice.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import styles from './EchoPrompt.module.css';

// Asks once per call, after the other side told us they hear an echo of themselves (see useEchoDetector). Only its
// buttons answer it (and Escape on a computer): a stray tap must not.
export const EchoPrompt = () => {
  const dispatch = useAppDispatch();

  return (
    <Dialog title="They hear an echo" dismissible={false} onClose={() => dispatch(echoPromptAnswered(false))}>
      <p className={styles.text}>
        The other person hears their own voice back from your device. Turn on echo guard for this call?
      </p>
      <div className={styles.buttons}>
        <Button variant="secondary" onClick={() => dispatch(echoPromptAnswered(false))}>No</Button>
        <Button onClick={() => dispatch(echoPromptAnswered(true))}>Turn on</Button>
      </div>
    </Dialog>
  );
};
