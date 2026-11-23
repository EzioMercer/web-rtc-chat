import type { ReactNode } from 'react';
import { Button } from '../Button/Button.tsx';
import { ButtonVariant } from '../Button/ButtonVariant.ts';
import { Dialog } from '../Dialog/Dialog.tsx';
import styles from './ConfirmDialog.module.css';

type Props = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  // Red for something that deletes or can't be undone.
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// A yes/no question in the app's own look, used instead of the browser's confirm() (which looks foreign and stops
// the page until it is answered). Only its buttons answer it (and Escape on a computer): a stray tap must not.
export const ConfirmDialog = ({ title, children, confirmLabel, danger, onConfirm, onCancel }: Props) => (
  <Dialog title={title} dismissible={false} onClose={onCancel}>
    <p className={styles.text}>{children}</p>
    <div className={styles.buttons}>
      <Button variant={ButtonVariant.Secondary} onClick={onCancel}>Cancel</Button>
      <Button variant={danger ? ButtonVariant.Danger : ButtonVariant.Primary} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </Dialog>
);
