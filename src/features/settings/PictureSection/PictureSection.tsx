import { useRef, useState, type ChangeEvent } from 'react';
import { setPicture } from '../../../store/thunks/profile/setPicture.ts';
import { errorMessage } from '../../../store/thunks/app/errorMessage.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Avatar } from '../../../ui/Avatar/Avatar.tsx';
import { Button } from '../../../ui/Button/Button.tsx';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import settingsStyles from '../SettingsDialog/SettingsDialog.module.css';
import styles from './PictureSection.module.css';

// Our picture, which every contact sees: choose, change or remove it.
export const PictureSection = () => {
  const dispatch = useAppDispatch();
  const picture = useAppSelector(state => state.profile.picture);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = async (file: Blob | null) => {
    setBusy(true);
    setError('');

    try {
      await dispatch(setPicture(file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // The same file can be chosen again later.
    e.target.value = '';

    if (file) {
      void change(file);
    }
  };

  return (
    <section className={settingsStyles.section}>
      <h3>Picture</h3>
      <div className={styles.row}>
        <Avatar picture={picture} size={64} />
        <div className={settingsStyles.buttons}>
          <Button variant={ButtonVariant.Secondary} disabled={busy} onClick={() => inputRef.current?.click()}>
            {picture ? 'Change' : 'Choose picture'}
          </Button>
          {picture && (
            <Button variant={ButtonVariant.Secondary} disabled={busy} onClick={() => void change(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && <p className={settingsStyles.warn}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
    </section>
  );
};
