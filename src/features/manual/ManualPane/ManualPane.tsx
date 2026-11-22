import { useState } from 'react';
import { startOver } from '../../../store/thunks/manual/startOver.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { getStatusLabel } from '../getStatusLabel.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { ChatHeader } from '../../chat/ChatHeader/ChatHeader.tsx';
import { Conversation } from '../../chat/Conversation/Conversation.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import { ManualSetup } from '../ManualSetup/ManualSetup.tsx';
import { SafetyPanel } from '../../contacts/SafetyPanel/SafetyPanel.tsx';
import styles from './ManualPane.module.css';
import { ManualStatus } from '../../../store/manual/types.ts';
import { IconButtonVariant } from '../../../ui/IconButton/IconButtonVariant.ts';

// The manual connection: code exchange first, then a normal conversation (not saved as a contact).
export const ManualPane = () => {
  const dispatch = useAppDispatch();
  const manual = useAppSelector(state => state.manual);
  const [showSafety, setShowSafety] = useState(true);
  const { status, safetyCode } = manual;

  if (status !== ManualStatus.Connected && status !== ManualStatus.Disconnected) {
    return (
      <section className={styles.pane}>
        <ChatHeader convKey={MANUAL_KEY} title="Connect manually" subtitle={getStatusLabel(manual)} connected={false} />
        <ManualSetup />
      </section>
    );
  }

  const header = (
    <ChatHeader
      convKey={MANUAL_KEY}
      title="Manual connection"
      subtitle={getStatusLabel(manual)}
      connected={status === ManualStatus.Connected}
      actions={(
        <>
          <IconButton
            icon="shield"
            label="Safety code"
            variant={showSafety ? IconButtonVariant.Neutral : IconButtonVariant.Plain}
            onClick={() => setShowSafety(!showSafety)}
          />
          <IconButton icon="close" label="Close connection" onClick={() => dispatch(startOver())} />
        </>
      )}
    />
  );

  return (
    <Conversation convKey={MANUAL_KEY} connected={status === ManualStatus.Connected} header={header}>
      {showSafety && <SafetyPanel code={safetyCode} />}
    </Conversation>
  );
};
