import { useState } from 'react';
import { startOver } from '../../store/thunks/manual/startOver.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { getStatusLabel } from '../../utils/getStatusLabel.ts';
import { MANUAL_KEY } from '../../webrtc/config.ts';
import { ChatHeader } from '../ChatHeader/ChatHeader.tsx';
import { Conversation } from '../Conversation/Conversation.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { ManualSetup } from '../ManualSetup/ManualSetup.tsx';
import { SafetyPanel } from '../SafetyPanel/SafetyPanel.tsx';
import styles from './ManualPane.module.css';

// The manual connection: code exchange first, then a normal conversation (not saved as a contact).
export const ManualPane = () => {
  const dispatch = useAppDispatch();
  const manual = useAppSelector(state => state.manual);
  const [showSafety, setShowSafety] = useState(true);
  const { status, safetyWords } = manual;

  if (status !== 'connected' && status !== 'disconnected') {
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
      connected={status === 'connected'}
      actions={(
        <>
          <IconButton
            icon="shield"
            label="Safety code"
            variant={showSafety ? 'neutral' : 'plain'}
            onClick={() => setShowSafety(!showSafety)}
          />
          <IconButton icon="close" label="Close connection" onClick={() => dispatch(startOver())} />
        </>
      )}
    />
  );

  return (
    <Conversation convKey={MANUAL_KEY} connected={status === 'connected'} header={header}>
      {showSafety && <SafetyPanel words={safetyWords} />}
    </Conversation>
  );
};
